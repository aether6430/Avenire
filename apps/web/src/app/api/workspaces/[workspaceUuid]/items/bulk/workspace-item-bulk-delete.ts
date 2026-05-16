import { NextResponse } from "next/server";
import {
  getFileAssetById,
  getFolderWithAncestors,
  isSharedFilesVirtualFolderId,
  softDeleteFileAsset,
  softDeleteFolder,
  userCanEditFile,
  userCanEditFolder,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import {
  buildWorkspaceItemBulkSummary,
  countSuccessfulWorkspaceItemBulkResults,
  type WorkspaceItemBulkMutationResult,
} from "./workspace-item-bulk-model";

export async function handleWorkspaceItemBulkDelete(input: {
  items: Array<{ id: string; kind: "file" | "folder" }>;
  userId: string;
  workspaceUuid: string;
}) {
  const results: WorkspaceItemBulkMutationResult[] = [];

  for (const item of input.items) {
    try {
      if (item.kind === "file") {
        const canEdit = await userCanEditFile({
          workspaceId: input.workspaceUuid,
          fileId: item.id,
          userId: input.userId,
        });
        if (!canEdit) {
          results.push({
            id: item.id,
            kind: item.kind,
            status: "failed",
            error: "Read-only file",
          });
          continue;
        }

        const file = await getFileAssetById(input.workspaceUuid, item.id);
        if (!file) {
          results.push({
            id: item.id,
            kind: item.kind,
            status: "failed",
            error: "File not found",
          });
          continue;
        }

        const deleted = await softDeleteFileAsset(input.workspaceUuid, item.id);
        if (!deleted) {
          results.push({
            id: item.id,
            kind: item.kind,
            status: "failed",
            error: "File not found",
          });
          continue;
        }

        results.push({ id: item.id, kind: item.kind, status: "ok" });
        continue;
      }

      const folder = await getFolderWithAncestors(
        input.workspaceUuid,
        item.id,
        input.userId
      );
      if (
        !folder ||
        isSharedFilesVirtualFolderId(item.id, input.workspaceUuid)
      ) {
        results.push({
          id: item.id,
          kind: item.kind,
          status: "failed",
          error: "Folder not found",
        });
        continue;
      }

      const canEdit = await userCanEditFolder({
        workspaceId: input.workspaceUuid,
        folderId: item.id,
        userId: input.userId,
      });
      if (!canEdit) {
        results.push({
          id: item.id,
          kind: item.kind,
          status: "failed",
          error: "Read-only folder",
        });
        continue;
      }

      await softDeleteFolder(input.workspaceUuid, item.id);
      results.push({ id: item.id, kind: item.kind, status: "ok" });
    } catch (error) {
      results.push({
        id: item.id,
        kind: item.kind,
        status: "failed",
        error: error instanceof Error ? error.message : "Delete failed",
      });
    }
  }

  if (countSuccessfulWorkspaceItemBulkResults(results) > 0) {
    await publishFilesInvalidationEvent({
      workspaceUuid: input.workspaceUuid,
      reason: "tree.changed",
    });
  }

  return NextResponse.json({
    ok: true,
    summary: buildWorkspaceItemBulkSummary(results),
    results,
  });
}
