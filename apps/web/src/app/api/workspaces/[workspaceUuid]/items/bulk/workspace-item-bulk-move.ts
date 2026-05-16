import { NextResponse } from "next/server";
import {
  isSharedFilesVirtualFolderId,
  updateFileAsset,
  updateFolder,
  userCanEditFile,
  userCanEditFolder,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import {
  buildWorkspaceItemBulkSummary,
  countSuccessfulWorkspaceItemBulkResults,
  type WorkspaceItemBulkMutationResult,
} from "./workspace-item-bulk-model";

export async function handleWorkspaceItemBulkMove(input: {
  items: Array<{ id: string; kind: "file" | "folder" }>;
  targetFolderId: string;
  userId: string;
  workspaceUuid: string;
}) {
  if (isSharedFilesVirtualFolderId(input.targetFolderId, input.workspaceUuid)) {
    return NextResponse.json(
      { error: "Cannot move items into Shared Files" },
      { status: 400 }
    );
  }

  const canEditTarget = await userCanEditFolder({
    workspaceId: input.workspaceUuid,
    folderId: input.targetFolderId,
    userId: input.userId,
  });
  if (!canEditTarget) {
    return NextResponse.json(
      { error: "Read-only target folder" },
      { status: 403 }
    );
  }

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

        const updated = await updateFileAsset(
          input.workspaceUuid,
          item.id,
          input.userId,
          {
            folderId: input.targetFolderId,
          }
        );

        if (!updated) {
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

      const updated = await updateFolder(
        input.workspaceUuid,
        item.id,
        input.userId,
        {
          parentId: input.targetFolderId,
        }
      );

      if (!updated) {
        results.push({
          id: item.id,
          kind: item.kind,
          status: "failed",
          error: "Folder not found",
        });
        continue;
      }

      results.push({ id: item.id, kind: item.kind, status: "ok" });
    } catch (error) {
      results.push({
        id: item.id,
        kind: item.kind,
        status: "failed",
        error: error instanceof Error ? error.message : "Move failed",
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
