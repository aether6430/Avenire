import { NextResponse } from "next/server";
import {
  getFileAssetById,
  isMarkdownFileRecord,
  isTrustedStorageUrl,
  replaceFileAssetContent,
  upsertMarkdownFileContent,
  userCanEditFile,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import { deleteUploadThingFile } from "@/lib/upload-registration";
import {
  isValidWorkspaceFileBinaryReplacement,
  resolveWorkspaceFileContentRouteBody,
  resolveWorkspaceFileContentRouteError,
  WORKSPACE_FILE_CONTENT_ERROR,
  type WorkspaceFileContentRouteBody,
} from "./workspace-file-content-route-model";

export type { WorkspaceFileContentRouteBody };

export async function handleWorkspaceFileContentPatch(input: {
  body: WorkspaceFileContentRouteBody;
  fileUuid: string;
  userId: string;
  workspaceUuid: string;
}) {
  try {
    const canEdit = await userCanEditFile({
      workspaceId: input.workspaceUuid,
      fileId: input.fileUuid,
      userId: input.userId,
    });
    if (!canEdit) {
      return NextResponse.json({ error: "Read-only file" }, { status: 403 });
    }

    const existing = await getFileAssetById(
      input.workspaceUuid,
      input.fileUuid
    );
    if (!existing) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    if (existing.isNote) {
      return NextResponse.json(
        { error: "Use the note update route" },
        { status: 400 }
      );
    }

    const resolved = resolveWorkspaceFileContentRouteBody(input.body);
    const isMarkdownFile = isMarkdownFileRecord(existing);

    if (isMarkdownFile && resolved.content !== null) {
      const replaced = await upsertMarkdownFileContent({
        content: resolved.content,
        fileId: input.fileUuid,
        metadata:
          resolved.nextPage === undefined
            ? undefined
            : { page: resolved.nextPage },
        userId: input.userId,
        workspaceId: input.workspaceUuid,
      });

      if (!replaced) {
        return NextResponse.json(
          { error: "Unable to replace file content" },
          { status: 404 }
        );
      }

      await publishFilesInvalidationEvent({
        workspaceUuid: input.workspaceUuid,
        folderId: replaced.file.folderId || undefined,
        reason: "file.updated",
      });

      if (
        replaced.previousStorageKey &&
        replaced.previousStorageKey !== replaced.file.storageKey
      ) {
        void deleteUploadThingFile(replaced.previousStorageKey);
      }

      return NextResponse.json({ file: replaced.file });
    }

    if (
      !isValidWorkspaceFileBinaryReplacement({
        sizeBytes: resolved.sizeBytes,
        storageKey: resolved.storageKey,
        storageUrl: resolved.storageUrl,
      })
    ) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (!isTrustedStorageUrl(resolved.storageUrl)) {
      return NextResponse.json(
        { error: "Invalid file source" },
        { status: 400 }
      );
    }

    const replaced = await replaceFileAssetContent(
      input.workspaceUuid,
      input.fileUuid,
      input.userId,
      {
        storageKey: resolved.storageKey,
        storageUrl: resolved.storageUrl,
        sizeBytes: resolved.sizeBytes,
        mimeType: resolved.mimeType,
        metadata:
          resolved.nextPage === undefined
            ? undefined
            : { page: resolved.nextPage },
        hashComputedBy: null,
        hashVerificationStatus: null,
        contentHashSha256: null,
      }
    );

    if (!replaced) {
      return NextResponse.json(
        { error: "Unable to replace file content" },
        { status: 404 }
      );
    }

    await publishFilesInvalidationEvent({
      workspaceUuid: input.workspaceUuid,
      folderId: replaced.file.folderId || undefined,
      reason: "file.updated",
    });

    if (
      replaced.previousStorageKey &&
      replaced.previousStorageKey !== replaced.file.storageKey
    ) {
      void deleteUploadThingFile(replaced.previousStorageKey);
    }

    return NextResponse.json({ file: replaced.file });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFileContentRouteError(
          error,
          WORKSPACE_FILE_CONTENT_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
