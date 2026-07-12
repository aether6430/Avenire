import { Schema } from "effect-v4";
import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api-request";
import { invalidateWorkspaceReadCaches } from "@/lib/domain-cache";
import {
  getFileAssetById,
  getFolderWithAncestors,
  isSharedFilesVirtualFolderId,
  softDeleteFileAsset,
  softDeleteFolder,
  updateFileAsset,
  updateFolder,
  userCanEditFile,
  userCanEditFolder,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import { getSessionUser } from "@/lib/workspace";
import {
  resolveWorkspaceBulkRouteError,
  WORKSPACE_BULK_OPERATION_ERROR,
} from "./workspace-items-bulk-route-model";

const itemSchema = Schema.Struct({
  id: Schema.String.check(Schema.isUUID()),
  kind: Schema.Literals(["file", "folder"]),
});

const requestSchema = Schema.Union([
  Schema.Struct({
    operation: Schema.Literal("delete"),
    items: Schema.Array(itemSchema).check(Schema.isLengthBetween(1, 500)),
  }),
  Schema.Struct({
    operation: Schema.Literal("move"),
    targetFolderId: Schema.String.check(Schema.isUUID()),
    items: Schema.Array(itemSchema).check(Schema.isLengthBetween(1, 500)),
  }),
]);

interface MutationResult {
  error?: string;
  id: string;
  kind: "file" | "folder";
  status: "ok" | "failed";
}

function buildWorkspaceBulkFailedResult(input: {
  error: string;
  id: string;
  kind: "file" | "folder";
}): MutationResult {
  return {
    error: input.error,
    id: input.id,
    kind: input.kind,
    status: "failed",
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceUuid } = await context.params;

    const parsed = await parseJsonRequest(request, requestSchema);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const payload = parsed.data;
    if (
      payload.operation === "move" &&
      isSharedFilesVirtualFolderId(payload.targetFolderId, workspaceUuid)
    ) {
      return NextResponse.json(
        { error: "Cannot move items into Shared Files" },
        { status: 400 }
      );
    }
    if (payload.operation === "move") {
      const canEditTarget = await userCanEditFolder({
        workspaceId: workspaceUuid,
        folderId: payload.targetFolderId,
        userId: user.id,
      });
      if (!canEditTarget) {
        return NextResponse.json(
          { error: "Read-only target folder" },
          { status: 403 }
        );
      }
    }

    const results: MutationResult[] = [];

    if (payload.operation === "delete") {
      for (const item of payload.items) {
        try {
          if (item.kind === "file") {
            const canEdit = await userCanEditFile({
              workspaceId: workspaceUuid,
              fileId: item.id,
              userId: user.id,
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
            const file = await getFileAssetById(workspaceUuid, item.id);
            if (!file) {
              results.push({
                id: item.id,
                kind: item.kind,
                status: "failed",
                error: "File not found",
              });
              continue;
            }

            const deleted = await softDeleteFileAsset(workspaceUuid, item.id);
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
            workspaceUuid,
            item.id,
            user.id
          );
          if (!folder || isSharedFilesVirtualFolderId(item.id, workspaceUuid)) {
            results.push({
              id: item.id,
              kind: item.kind,
              status: "failed",
              error: "Folder not found",
            });
            continue;
          }
          const canEdit = await userCanEditFolder({
            workspaceId: workspaceUuid,
            folderId: item.id,
            userId: user.id,
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

          await softDeleteFolder(workspaceUuid, item.id);
          results.push({ id: item.id, kind: item.kind, status: "ok" });
        } catch (error) {
          results.push({
            id: item.id,
            kind: item.kind,
            status: "failed",
            error: "Delete failed",
          });
        }
      }
    } else {
      for (const item of payload.items) {
        try {
          if (item.kind === "file") {
            const canEdit = await userCanEditFile({
              workspaceId: workspaceUuid,
              fileId: item.id,
              userId: user.id,
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
              workspaceUuid,
              item.id,
              user.id,
              {
                folderId: payload.targetFolderId,
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
            workspaceId: workspaceUuid,
            folderId: item.id,
            userId: user.id,
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

          if (item.id === payload.targetFolderId) {
            results.push(
              buildWorkspaceBulkFailedResult({
                error: "Cannot move a folder into itself",
                id: item.id,
                kind: item.kind,
              })
            );
            continue;
          }

          const targetFolderTree = await getFolderWithAncestors(
            workspaceUuid,
            payload.targetFolderId,
            user.id
          );
          if (
            targetFolderTree?.ancestors.some(
              (ancestor) => ancestor.id === item.id
            )
          ) {
            results.push(
              buildWorkspaceBulkFailedResult({
                error: "Cannot move a folder into its descendant",
                id: item.id,
                kind: item.kind,
              })
            );
            continue;
          }

          const updated = await updateFolder(workspaceUuid, item.id, user.id, {
            parentId: payload.targetFolderId,
          });

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
            error: "Move failed",
          });
        }
      }
    }

    const succeeded = results.filter((entry) => entry.status === "ok").length;
    if (succeeded > 0) {
      const specificInvalidations = results.flatMap((entry) =>
        entry.status === "ok"
          ? [
              publishFilesInvalidationEvent({
                workspaceUuid,
                reason:
                  payload.operation === "delete"
                    ? entry.kind === "file"
                      ? "file.deleted"
                      : "folder.deleted"
                    : entry.kind === "file"
                      ? "file.updated"
                      : "folder.updated",
                ...(entry.kind === "file"
                  ? { fileId: entry.id }
                  : { folderId: entry.id }),
              }),
            ]
          : []
      );

      await Promise.all([
        invalidateWorkspaceReadCaches(workspaceUuid),
        ...specificInvalidations,
        publishFilesInvalidationEvent({
          workspaceUuid,
          reason: "tree.changed",
        }),
      ]);
    }

    return NextResponse.json({
      ok: true,
      summary: {
        total: results.length,
        succeeded,
        failed: results.length - succeeded,
      },
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceBulkRouteError(
          error,
          WORKSPACE_BULK_OPERATION_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
