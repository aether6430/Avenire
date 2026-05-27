import { NextResponse } from "next/server";
import { invalidateWorkspaceReadCaches } from "@/lib/domain-cache";
import {
  deleteIngestionDataForFile,
  getFileAssetById,
  isSharedFilesVirtualFolderId,
  softDeleteFileAsset,
  updateFileAsset,
  userCanEditFile,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import {
  resolveWorkspaceFileRouteError,
  resolveWorkspaceFileRoutePatchMetadata,
  WORKSPACE_FILE_DELETE_ERROR,
  WORKSPACE_FILE_UPDATE_ERROR,
} from "./workspace-file-route-model";

export async function handleWorkspaceFilePatch(input: {
  body: {
    name?: string;
    folderId?: string;
    metadata?: Record<string, unknown>;
    page?: {
      bannerUrl?: string | null;
      icon?: string | null;
      properties?: Record<string, unknown>;
    };
  };
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

    if (
      input.body.folderId &&
      isSharedFilesVirtualFolderId(input.body.folderId, input.workspaceUuid)
    ) {
      return NextResponse.json(
        { error: "Cannot move items into Shared Files" },
        { status: 400 }
      );
    }

    const file = await updateFileAsset(
      input.workspaceUuid,
      input.fileUuid,
      input.userId,
      {
        folderId: input.body.folderId,
        metadata: resolveWorkspaceFileRoutePatchMetadata({
          metadata: input.body.metadata,
          page: input.body.page,
        }),
        name: input.body.name,
      }
    );

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await Promise.all([
      invalidateWorkspaceReadCaches(input.workspaceUuid),
      publishFilesInvalidationEvent({
        workspaceUuid: input.workspaceUuid,
        folderId: file.folderId,
        reason: "file.updated",
      }),
      publishFilesInvalidationEvent({
        workspaceUuid: input.workspaceUuid,
        reason: "tree.changed",
      }),
    ]);

    return NextResponse.json({ file });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFileRouteError(
          error,
          WORKSPACE_FILE_UPDATE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}

export async function handleWorkspaceFileDelete(input: {
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

    await deleteIngestionDataForFile(input.workspaceUuid, input.fileUuid);

    const ok = await softDeleteFileAsset(input.workspaceUuid, input.fileUuid);
    if (!ok) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await Promise.all([
      invalidateWorkspaceReadCaches(input.workspaceUuid),
      publishFilesInvalidationEvent({
        workspaceUuid: input.workspaceUuid,
        folderId: existing.folderId || undefined,
        reason: "file.deleted",
      }),
      publishFilesInvalidationEvent({
        workspaceUuid: input.workspaceUuid,
        reason: "tree.changed",
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFileRouteError(
          error,
          WORKSPACE_FILE_DELETE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
