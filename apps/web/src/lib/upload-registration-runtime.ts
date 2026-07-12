import {
  canStoreBytesForUser,
  hasSuccessfulIngestionForFile,
} from "@avenire/database";
import { scheduleIngestionJob } from "@avenire/ingestion/queue";
import { deleteStorageFiles } from "@avenire/storage";
import {
  createWorkspaceNoteFile,
  getFileAssetByContentHash,
  getFileAssetByStorageKey,
  getFileAssetByUploadSessionId,
  registerFileAsset,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import type {
  UploadRegistrationInput,
  UploadRegistrationResult,
} from "@/lib/upload-registration";
import {
  assertTrustedUploadStorageUrl,
  extractMarkdownNotePayload,
  isMarkdownUpload,
  normalizeSha256,
  resolveMimeType,
} from "@/lib/upload-registration-model";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";

async function publishRegisteredUpload(input: {
  deduplicated: boolean;
  file: Awaited<ReturnType<typeof registerFileAsset>>;
  folderId: string;
  ingestionJob: Awaited<ReturnType<typeof scheduleIngestionJob>> | null;
  source: "upload.dedupe" | "upload.register";
  workspaceUuid: string;
}) {
  const tasks: Promise<unknown>[] = [
    publishWorkspaceStreamEvent({
      workspaceUuid: input.workspaceUuid,
      type: "upload.finalized",
      payload: {
        deduplicated: input.deduplicated,
        fileId: input.file.id,
        folderId: input.folderId,
        workspaceUuid: input.workspaceUuid,
      },
    }),
  ];

  if (!input.deduplicated) {
    tasks.push(
      publishFilesInvalidationEvent({
        workspaceUuid: input.workspaceUuid,
        fileId: input.file.id,
        folderId: input.folderId,
        reason: "file.created",
      }),
      publishFilesInvalidationEvent({
        workspaceUuid: input.workspaceUuid,
        reason: "tree.changed",
      })
    );
  }

  if (input.ingestionJob) {
    tasks.push(
      publishWorkspaceStreamEvent({
        workspaceUuid: input.workspaceUuid,
        type: "ingestion.job",
        payload: {
          createdAt: new Date().toISOString(),
          eventType: "job.queued",
          jobId: input.ingestionJob.id,
          payload: { status: "queued", source: input.source },
          workspaceId: input.workspaceUuid,
        },
      })
    );
  }

  await Promise.allSettled(tasks);
}

export async function registerWorkspaceMarkdownNote(input: {
  content: string;
  dedupeMode?: "allow" | "skip";
  folderId: string;
  metadata?: Record<string, unknown>;
  name: string;
  userId: string;
  workspaceUuid: string;
}): Promise<UploadRegistrationResult> {
  const dedupeMode = input.dedupeMode ?? "allow";
  const normalizedNote = extractMarkdownNotePayload({
    metadata: input.metadata,
    rawContent: input.content,
  });
  const normalizedHash = normalizeSha256(normalizedNote.contentHashSha256);

  if (dedupeMode !== "skip" && normalizedHash) {
    const existing = await getFileAssetByContentHash(
      input.workspaceUuid,
      normalizedHash
    );
    if (existing) {
      const hasSucceeded = await hasSuccessfulIngestionForFile(
        input.workspaceUuid,
        existing.id
      ).catch(() => false);
      const ingestionJob = hasSucceeded
        ? null
        : await scheduleIngestionJob({
            workspaceId: input.workspaceUuid,
            fileId: existing.id,
          }).catch((error) => {
            console.error("upload.ingestion_enqueue_failed", {
              workspaceUuid: input.workspaceUuid,
              fileId: existing.id,
              error,
            });
            return null;
          });

      await publishRegisteredUpload({
        deduplicated: true,
        file: existing,
        folderId: existing.folderId,
        ingestionJob,
        source: "upload.dedupe",
        workspaceUuid: input.workspaceUuid,
      });

      return {
        file: existing,
        ingestionJob,
        status: "deduplicated",
      };
    }
  }

  const noteBytes = new TextEncoder().encode(normalizedNote.content).byteLength;
  const storage = await canStoreBytesForUser(input.userId, noteBytes);
  if (!storage.ok) {
    throw Object.assign(new Error("Storage limit reached"), {
      code: "STORAGE_LIMIT",
      limitBytes: storage.limitBytes,
      usedBytes: storage.usedBytes,
    });
  }

  const file = await createWorkspaceNoteFile({
    workspaceId: input.workspaceUuid,
    userId: input.userId,
    folderId: input.folderId,
    name: input.name,
    baseContent: normalizedNote.content,
    content: normalizedNote.content,
    metadata: {
      ...(normalizedNote.metadata ?? {}),
      type: "note",
    },
  });

  const ingestionJob = await scheduleIngestionJob({
    workspaceId: input.workspaceUuid,
    fileId: file.id,
    sourceType: "markdown",
  }).catch((error) => {
    console.error("upload.ingestion_enqueue_failed", {
      workspaceUuid: input.workspaceUuid,
      fileId: file.id,
      error,
    });
    return null;
  });

  await publishRegisteredUpload({
    deduplicated: false,
    file,
    folderId: input.folderId,
    ingestionJob,
    source: "upload.register",
    workspaceUuid: input.workspaceUuid,
  });

  return {
    file,
    ingestionJob,
    status: "created",
  };
}

export async function deleteUploadThingFile(
  storageKey: string | null | undefined
) {
  if (!(storageKey && process.env.UPLOADTHING_TOKEN)) {
    return;
  }

  try {
    await deleteStorageFiles([storageKey]);
  } catch {
    // Best-effort cleanup.
  }
}

export async function registerWorkspaceUploadedFile(
  input: UploadRegistrationInput
): Promise<UploadRegistrationResult> {
  const dedupeMode = input.dedupeMode ?? "allow";
  const resolvedMimeType = resolveMimeType({
    mimeType: input.mimeType,
    name: input.name,
  });
  const trustedStorageUrl = assertTrustedUploadStorageUrl(
    input.storageUrl,
    input.storageKey
  );
  if (isMarkdownUpload({ mimeType: resolvedMimeType, name: input.name })) {
    const response = await fetch(trustedStorageUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to read uploaded markdown file.");
    }

    const content = await response.text();
    const result = await registerWorkspaceMarkdownNote({
      content,
      dedupeMode,
      folderId: input.folderId,
      metadata: input.metadata,
      name: input.name,
      userId: input.userId,
      workspaceUuid: input.workspaceUuid,
    });
    await deleteUploadThingFile(input.storageKey);
    return result;
  }

  const normalizedUpload = {
    contentHashSha256: input.contentHashSha256 ?? null,
    metadata: input.metadata,
    sizeBytes: input.sizeBytes,
    storageKey: input.storageKey,
    storageUrl: trustedStorageUrl,
  };
  const normalizedHash = normalizeSha256(normalizedUpload.contentHashSha256);

  if (dedupeMode !== "skip") {
    const existingByUploadSession = input.uploadSessionId
      ? await getFileAssetByUploadSessionId(input.uploadSessionId)
      : null;
    const existingByHash = normalizedHash
      ? await getFileAssetByContentHash(input.workspaceUuid, normalizedHash)
      : null;
    const existingByNormalizedStorage =
      normalizedUpload.storageKey !== input.storageKey
        ? await getFileAssetByStorageKey(
            input.workspaceUuid,
            normalizedUpload.storageKey
          )
        : null;
    const existing =
      existingByUploadSession ??
      existingByHash ??
      existingByNormalizedStorage ??
      (await getFileAssetByStorageKey(input.workspaceUuid, input.storageKey));
    if (existing) {
      if (
        existingByUploadSession &&
        existingByUploadSession.storageKey !== input.storageKey
      ) {
        await deleteUploadThingFile(input.storageKey);
      }
      const hasSucceeded = await hasSuccessfulIngestionForFile(
        input.workspaceUuid,
        existing.id
      ).catch(() => false);
      const ingestionJob = hasSucceeded
        ? null
        : await scheduleIngestionJob({
            workspaceId: input.workspaceUuid,
            fileId: existing.id,
          }).catch((error) => {
            console.error("upload.ingestion_enqueue_failed", {
              workspaceUuid: input.workspaceUuid,
              fileId: existing.id,
              error,
            });
            return null;
          });

      await publishRegisteredUpload({
        deduplicated: true,
        file: existing,
        folderId: existing.folderId,
        ingestionJob,
        source: "upload.dedupe",
        workspaceUuid: input.workspaceUuid,
      });

      return {
        file: existing,
        ingestionJob,
        status: "deduplicated",
      };
    }
  }

  const storage = await canStoreBytesForUser(
    input.userId,
    normalizedUpload.sizeBytes
  );
  if (!storage.ok) {
    await deleteUploadThingFile(input.storageKey);
    throw Object.assign(new Error("Storage limit reached"), {
      code: "STORAGE_LIMIT",
      limitBytes: storage.limitBytes,
      usedBytes: storage.usedBytes,
    });
  }

  const file = await registerFileAsset(input.workspaceUuid, input.userId, {
    folderId: input.folderId,
    storageKey: normalizedUpload.storageKey,
    storageUrl: normalizedUpload.storageUrl,
    name: input.name,
    mimeType: resolvedMimeType,
    sizeBytes: normalizedUpload.sizeBytes,
    metadata: normalizedUpload.metadata,
    contentHashSha256: normalizedHash,
    hashComputedBy: normalizedHash ? (input.hashComputedBy ?? "client") : null,
    hashVerificationStatus: normalizedHash ? "pending" : null,
    uploadSessionId: input.uploadSessionId ?? null,
  });

  const ingestionJob = await scheduleIngestionJob({
    workspaceId: input.workspaceUuid,
    fileId: file.id,
  }).catch((error) => {
    console.error("upload.ingestion_enqueue_failed", {
      workspaceUuid: input.workspaceUuid,
      fileId: file.id,
      error,
    });
    return null;
  });

  await publishRegisteredUpload({
    deduplicated: false,
    file,
    folderId: input.folderId,
    ingestionJob,
    source: "upload.register",
    workspaceUuid: input.workspaceUuid,
  });

  return {
    file,
    ingestionJob,
    status: "created",
  };
}
