"use client";

import {
  buildExplorerDedupeLookupInput,
  buildExplorerIndexedUploadCandidates,
  buildExplorerUploadQueueEntries,
  chunkArray,
  computeSha256Hex,
  ENABLE_PREUPLOAD_DEDUPE,
  type ExplorerUploadCandidate,
  type ExplorerUploadQueueItem,
  isMarkdownUploadCandidate,
  shouldHashForClientDedupe,
} from "@/components/files/explorer/explorer-upload-model";
import type { FolderRecord } from "@/components/files/explorer/shared";
import { getUploadErrorMessage } from "@/lib/upload-error-message";
import { requestUploadPreflight } from "@/lib/upload-preflight";
import {
  applyExplorerDedupeHitsToQueue,
  applyExplorerRegisterFailureToQueue,
  applyExplorerRegisterResultsToQueue,
  countSuccessfulExplorerRegisterResults,
  type ExplorerBulkRegisterResult,
} from "./explorer-upload-batch-model";

export interface UploadResultLike {
  contentType?: string;
  key?: string;
  name?: string;
  size?: number;
  ufsUrl?: string;
}

interface BulkRegisterResponse {
  results?: ExplorerBulkRegisterResult[];
  summary?: {
    failed?: number;
    succeeded?: number;
    total?: number;
  };
}

interface DedupeLookupResponse {
  results?: Array<{
    clientUploadId: string;
    deduped: boolean;
    file?: { id?: string };
  }>;
}

export interface ExplorerPreparedUpload {
  content?: string;
  contentHashSha256?: string;
  file: File;
  queueItemId: string;
  targetFolderId: string;
  uploaded?: UploadResultLike;
}

interface RunExplorerUploadBatchOptions {
  allFolders: FolderRecord[];
  candidates: ExplorerUploadCandidate[];
  currentFolderId: string;
  emitSync: () => void;
  loadFolder: (options?: { silent?: boolean }) => Promise<void>;
  loadTree: () => Promise<void>;
  setUploadQueue: (
    updater:
      | ExplorerUploadQueueItem[]
      | ((previous: ExplorerUploadQueueItem[]) => ExplorerUploadQueueItem[])
  ) => void;
  startUpload: (files: File[]) => Promise<UploadResultLike[] | undefined>;
  workspaceUuid: string;
}

export function buildExplorerUploadPreflightInput(input: {
  contentHashSha256?: string;
  file: File;
  targetFolderId: string;
  workspaceUuid: string;
}) {
  return {
    checksumSha256: input.contentHashSha256,
    file: input.file,
    folderId: input.targetFolderId,
    workspaceUuid: input.workspaceUuid,
  };
}

export function buildExplorerRegisterFilePayload(
  entry: ExplorerPreparedUpload
) {
  return {
    clientUploadId: entry.queueItemId,
    content: entry.content,
    contentHashSha256: entry.contentHashSha256,
    folderId: entry.targetFolderId,
    hashComputedBy: entry.contentHashSha256 ? "client" : undefined,
    mimeType: entry.uploaded?.contentType ?? entry.file.type,
    name: entry.uploaded?.name ?? entry.file.name,
    sizeBytes: entry.uploaded?.size ?? entry.file.size,
    storageKey: entry.uploaded?.key,
    storageUrl: entry.uploaded?.ufsUrl,
  };
}

export async function runExplorerUploadBatch({
  allFolders,
  candidates,
  currentFolderId,
  emitSync,
  loadFolder,
  loadTree,
  setUploadQueue,
  startUpload,
  workspaceUuid,
}: RunExplorerUploadBatchOptions) {
  const { isFolderUploadBatch, normalizedCandidates, queueEntries } =
    buildExplorerUploadQueueEntries(candidates);

  if (
    !(workspaceUuid && currentFolderId) ||
    normalizedCandidates.length === 0
  ) {
    return;
  }

  setUploadQueue((previous) => [...queueEntries, ...previous]);

  const folderLookup = new Map<string, string>();
  for (const folder of allFolders) {
    folderLookup.set(
      `${folder.parentId ?? "__root__"}::${folder.name.toLowerCase()}`,
      folder.id
    );
  }

  const ensureFolderPath = async (relativePath?: string) => {
    if (!(relativePath && workspaceUuid)) {
      return currentFolderId;
    }
    const normalized = relativePath.replaceAll("\\", "/");
    const segments = normalized.split("/").filter(Boolean);
    if (segments.length <= 1) {
      return currentFolderId;
    }

    let parentId = currentFolderId;
    for (const segment of segments.slice(0, -1)) {
      const key = `${parentId}::${segment.toLowerCase()}`;
      const existing = folderLookup.get(key);
      if (existing) {
        parentId = existing;
        continue;
      }

      const response = await fetch(`/api/workspaces/${workspaceUuid}/folders`, {
        body: JSON.stringify({ parentId, name: segment }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Unable to create folder "${segment}"`);
      }
      const payload = (await response.json()) as {
        folder?: { id?: string };
      };
      const createdId = payload.folder?.id;
      if (!createdId) {
        throw new Error(`Folder "${segment}" could not be created`);
      }
      folderLookup.set(key, createdId);
      parentId = createdId;
    }
    return parentId;
  };

  const maxParallelHashing = 3;
  const maxParallelUploads = 4;
  const dedupeLookupChunkSize = 100;
  const registerChunkSize = 40;
  const preparedForRegister: ExplorerPreparedUpload[] = [];
  let successCount = 0;
  let uploadCursor = 0;
  const folderPathInflight = new Map<string, Promise<string>>();
  const indexedCandidates = buildExplorerIndexedUploadCandidates(
    normalizedCandidates,
    queueEntries
  );
  const hashByQueueId = new Map<string, string>();
  const dedupeHitByQueueId = new Map<string, { fileId?: string }>();

  if (!isFolderUploadBatch && ENABLE_PREUPLOAD_DEDUPE) {
    let hashCursor = 0;
    const runHashWorker = async () => {
      while (true) {
        const index = hashCursor;
        hashCursor += 1;
        if (index >= indexedCandidates.length) {
          return;
        }
        const entry = indexedCandidates[index];
        if (!entry?.queueItemId) {
          continue;
        }

        if (!shouldHashForClientDedupe(entry.candidate.file)) {
          continue;
        }

        const hash = await computeSha256Hex(entry.candidate.file);
        if (!hash) {
          continue;
        }

        hashByQueueId.set(entry.queueItemId, hash);
        setUploadQueue((previous) =>
          previous.map((item) =>
            item.id === entry.queueItemId
              ? { ...item, contentHashSha256: hash }
              : item
          )
        );
      }
    };

    await Promise.all(
      Array.from(
        {
          length: Math.min(
            Math.max(1, indexedCandidates.length),
            maxParallelHashing
          ),
        },
        () => runHashWorker()
      )
    );

    const dedupeChunks = chunkArray(
      buildExplorerDedupeLookupInput(indexedCandidates, hashByQueueId),
      dedupeLookupChunkSize
    );

    for (const dedupeChunk of dedupeChunks) {
      if (dedupeChunk.length === 0) {
        continue;
      }

      try {
        const response = await fetch(
          `/api/workspaces/${workspaceUuid}/files/dedupe/lookup`,
          {
            body: JSON.stringify({
              files: dedupeChunk.map((entry) => ({
                clientUploadId: entry.clientUploadId,
                folderId: currentFolderId,
                hashSha256: entry.hashSha256,
                mimeType: entry.mimeType,
                name: entry.name,
                sizeBytes: entry.sizeBytes,
              })),
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          }
        );

        if (!response.ok) {
          continue;
        }

        const payload = (await response.json()) as DedupeLookupResponse;
        for (const result of payload.results ?? []) {
          if (!result.deduped) {
            continue;
          }
          dedupeHitByQueueId.set(result.clientUploadId, {
            fileId: result.file?.id,
          });
        }
      } catch {
        // Best effort. Fallback is normal upload path.
      }
    }
  }

  if (dedupeHitByQueueId.size > 0) {
    successCount += dedupeHitByQueueId.size;
    setUploadQueue((previous) =>
      applyExplorerDedupeHitsToQueue(previous, dedupeHitByQueueId)
    );
  }

  const uploadTargets = indexedCandidates.filter(
    (entry) => !dedupeHitByQueueId.has(entry.queueItemId)
  );

  const processOneUpload = async (entry: (typeof uploadTargets)[number]) => {
    if (!entry.queueItemId) {
      return;
    }

    setUploadQueue((previous) =>
      previous.map((item) =>
        item.id === entry.queueItemId
          ? { ...item, error: undefined, status: "uploading" }
          : item
      )
    );

    try {
      const normalizedPath =
        entry.candidate.relativePath ?? entry.candidate.file.name;
      const lastSeparator = normalizedPath.lastIndexOf("/");
      const folderPathKey =
        lastSeparator >= 0
          ? normalizedPath.slice(0, lastSeparator)
          : "__root__";
      const targetFolderId = await (folderPathInflight.get(folderPathKey) ??
        (() => {
          const task = ensureFolderPath(entry.candidate.relativePath);
          folderPathInflight.set(folderPathKey, task);
          return task;
        })());

      if (isMarkdownUploadCandidate(entry.candidate.file)) {
        preparedForRegister.push({
          content: await entry.candidate.file.text(),
          contentHashSha256: hashByQueueId.get(entry.queueItemId),
          file: entry.candidate.file,
          queueItemId: entry.queueItemId,
          targetFolderId,
        });
      } else {
        await requestUploadPreflight(
          buildExplorerUploadPreflightInput({
            contentHashSha256: hashByQueueId.get(entry.queueItemId),
            file: entry.candidate.file,
            targetFolderId,
            workspaceUuid,
          })
        );
        const uploaded = ((await startUpload([entry.candidate.file])) ?? [])[0];
        if (!(uploaded?.key && uploaded.ufsUrl)) {
          throw new Error("Upload returned no file metadata");
        }

        preparedForRegister.push({
          contentHashSha256: hashByQueueId.get(entry.queueItemId),
          file: entry.candidate.file,
          queueItemId: entry.queueItemId,
          targetFolderId,
          uploaded,
        });
      }

      setUploadQueue((previous) =>
        previous.map((item) =>
          item.id === entry.queueItemId
            ? { ...item, error: undefined, status: "uploaded" }
            : item
        )
      );
    } catch (error) {
      const message = getUploadErrorMessage(error);
      setUploadQueue((previous) =>
        previous.map((item) =>
          item.id === entry.queueItemId
            ? {
                ...item,
                error: message,
                failureCount: (item.failureCount ?? 0) + 1,
                status: "failed",
              }
            : item
        )
      );
    }
  };

  const runUploadWorker = async () => {
    while (true) {
      const index = uploadCursor;
      uploadCursor += 1;
      if (index >= uploadTargets.length) {
        return;
      }

      const entry = uploadTargets[index];
      if (!entry) {
        return;
      }
      await processOneUpload(entry);
    }
  };

  await Promise.all(
    Array.from(
      {
        length: Math.min(Math.max(1, uploadTargets.length), maxParallelUploads),
      },
      () => runUploadWorker()
    )
  );

  const registerChunks = chunkArray(preparedForRegister, registerChunkSize);
  for (const registerChunk of registerChunks) {
    if (registerChunk.length === 0) {
      continue;
    }

    try {
      const registerResponse = await fetch(
        `/api/workspaces/${workspaceUuid}/files/register/bulk`,
        {
          body: JSON.stringify({
            dedupeMode:
              isFolderUploadBatch || !ENABLE_PREUPLOAD_DEDUPE
                ? "skip"
                : "allow",
            files: registerChunk.map(buildExplorerRegisterFilePayload),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

      if (!registerResponse.ok) {
        throw new Error("File metadata registration failed");
      }

      const payload = (await registerResponse.json()) as BulkRegisterResponse;
      const chunkSucceeded = countSuccessfulExplorerRegisterResults(
        payload.results ?? []
      );
      successCount += chunkSucceeded;

      setUploadQueue((previous) =>
        applyExplorerRegisterResultsToQueue(previous, payload.results ?? [])
      );

      if (chunkSucceeded > 0) {
        void loadFolder({ silent: true });
        void loadTree();
        emitSync();
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "File metadata registration failed";
      const queueItemIds = registerChunk.map((entry) => entry.queueItemId);
      setUploadQueue((previous) =>
        applyExplorerRegisterFailureToQueue(previous, queueItemIds, message)
      );
    }
  }

  if (successCount > 0) {
    await Promise.all([loadFolder(), loadTree()]);
    emitSync();
  }
}
