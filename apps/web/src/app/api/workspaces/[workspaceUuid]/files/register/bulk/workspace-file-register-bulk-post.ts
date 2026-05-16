import { NextResponse } from "next/server";
import { invalidateWorkspaceReadCaches } from "@/lib/domain-cache";
import {
  isSharedFilesVirtualFolderId,
  userCanEditFolder,
} from "@/lib/file-data";
import {
  registerWorkspaceMarkdownNote,
  registerWorkspaceUploadedFile,
} from "@/lib/upload-registration";
import { scheduleAsyncVideoDeliveryOptimization } from "@/lib/video-delivery-optimization";
import {
  buildWorkspaceFileRegisterBulkSummary,
  isWorkspaceFileRegisterBulkNotePayload,
  type WorkspaceFileRegisterBulkRequest,
  type WorkspaceFileRegisterBulkResult,
} from "./workspace-file-register-bulk-model";

function buildWorkspaceFileRegisterBulkFailedResult(input: {
  clientUploadId: string;
  error: string;
}): WorkspaceFileRegisterBulkResult {
  return {
    clientUploadId: input.clientUploadId,
    error: input.error,
    status: "failed",
  };
}

export async function postWorkspaceFileRegisterBulk(input: {
  body: WorkspaceFileRegisterBulkRequest;
  userId: string;
  workspaceUuid: string;
}) {
  const dedupeMode = input.body.dedupeMode ?? "allow";
  const results: WorkspaceFileRegisterBulkResult[] = [];
  const canEditByFolderId = new Map<string, boolean>();
  const folderIds = [
    ...new Set(
      input.body.files
        .map((file) => file.folderId)
        .filter(
          (folderId) =>
            !isSharedFilesVirtualFolderId(folderId, input.workspaceUuid)
        )
    ),
  ];

  await Promise.all(
    folderIds.map(async (folderId) => {
      const canEdit = await userCanEditFolder({
        workspaceId: input.workspaceUuid,
        folderId,
        userId: input.userId,
      });
      canEditByFolderId.set(folderId, canEdit);
    })
  );

  for (const fileInput of input.body.files) {
    try {
      if (
        isSharedFilesVirtualFolderId(fileInput.folderId, input.workspaceUuid)
      ) {
        results.push(
          buildWorkspaceFileRegisterBulkFailedResult({
            clientUploadId: fileInput.clientUploadId,
            error: "Cannot create items in Shared Files",
          })
        );
        continue;
      }

      const canEdit = canEditByFolderId.get(fileInput.folderId) ?? false;
      if (!canEdit) {
        results.push(
          buildWorkspaceFileRegisterBulkFailedResult({
            clientUploadId: fileInput.clientUploadId,
            error: "Read-only folder",
          })
        );
        continue;
      }

      const registrationResult = isWorkspaceFileRegisterBulkNotePayload(
        fileInput
      )
        ? await registerWorkspaceMarkdownNote({
            content: fileInput.content,
            dedupeMode,
            folderId: fileInput.folderId,
            metadata: fileInput.metadata,
            name: fileInput.name,
            userId: input.userId,
            workspaceUuid: input.workspaceUuid,
          })
        : await registerWorkspaceUploadedFile({
            workspaceUuid: input.workspaceUuid,
            userId: input.userId,
            folderId: fileInput.folderId,
            storageKey: fileInput.storageKey,
            storageUrl: fileInput.storageUrl,
            name: fileInput.name,
            mimeType: fileInput.mimeType,
            sizeBytes: fileInput.sizeBytes,
            metadata: fileInput.metadata,
            contentHashSha256: fileInput.contentHashSha256,
            hashComputedBy: fileInput.hashComputedBy,
            dedupeMode,
          });

      results.push({
        clientUploadId: fileInput.clientUploadId,
        status: "ok",
        file: { id: registrationResult.file.id },
        ingestionJob: registrationResult.ingestionJob,
      });

      if (
        registrationResult.status === "created" &&
        registrationResult.file.mimeType?.startsWith("video/")
      ) {
        scheduleAsyncVideoDeliveryOptimization({
          file: registrationResult.file,
          userId: input.userId,
          workspaceUuid: input.workspaceUuid,
        });
      }
    } catch (error) {
      const isRateLimit =
        (error as { code?: string } | null | undefined)?.code ===
        "UPLOAD_RATE_LIMIT";
      results.push(
        buildWorkspaceFileRegisterBulkFailedResult({
          clientUploadId: fileInput.clientUploadId,
          error: isRateLimit
            ? "Upload usage limit reached"
            : error instanceof Error
              ? error.message
              : "Registration failed",
        })
      );
    }
  }

  const summary = buildWorkspaceFileRegisterBulkSummary(results);

  if (summary.succeeded > 0) {
    await invalidateWorkspaceReadCaches(input.workspaceUuid);
  }

  return NextResponse.json({
    ok: true,
    summary,
    results,
  });
}
