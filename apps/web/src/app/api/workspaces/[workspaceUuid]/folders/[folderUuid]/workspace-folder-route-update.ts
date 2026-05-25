import { NextResponse } from "next/server";
import { invalidateWorkspaceReadCaches } from "@/lib/domain-cache";
import {
  getFolderWithAncestors,
  isSharedFilesVirtualFolderId,
  listWorkspaceMembers,
  updateFolder,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import {
  canManageWorkspaceFolderRole,
  collectWorkspaceFolderTreeChangedParentIds,
  resolveWorkspaceFolderRouteError,
  WORKSPACE_FOLDER_UPDATE_ERROR,
} from "./workspace-folder-route-model";

export async function handleWorkspaceFolderUpdate(input: {
  body: {
    bannerUrl?: string | null;
    iconColor?: string | null;
    name?: string;
    parentId?: string | null;
  };
  folderUuid: string;
  userId: string;
  workspaceUuid: string;
}) {
  try {
    if (
      input.body.parentId &&
      isSharedFilesVirtualFolderId(input.body.parentId, input.workspaceUuid)
    ) {
      return NextResponse.json(
        { error: "Cannot move items into Shared Files" },
        { status: 400 }
      );
    }

    const members = await listWorkspaceMembers(input.workspaceUuid);
    const currentMember = members.find(
      (member) => member.userId === input.userId
    );
    if (!canManageWorkspaceFolderRole(currentMember?.role ?? null)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await getFolderWithAncestors(
      input.workspaceUuid,
      input.folderUuid,
      input.userId
    );
    if (!existing) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    const oldParentId = existing.folder.parentId;

    const folder = await updateFolder(
      input.workspaceUuid,
      input.folderUuid,
      input.userId,
      {
        bannerUrl: input.body.bannerUrl,
        iconColor: input.body.iconColor,
        name: input.body.name,
        parentId: input.body.parentId,
      }
    );

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    await publishFilesInvalidationEvent({
      workspaceUuid: input.workspaceUuid,
      folderId: folder.id,
      reason: "folder.updated",
    });
    await Promise.all(
      collectWorkspaceFolderTreeChangedParentIds(
        oldParentId,
        folder.parentId
      ).map((parentId) =>
        publishFilesInvalidationEvent({
          workspaceUuid: input.workspaceUuid,
          folderId: parentId,
          reason: "tree.changed",
        })
      )
    );
    await invalidateWorkspaceReadCaches(input.workspaceUuid);

    return NextResponse.json({ folder });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFolderRouteError(
          error,
          WORKSPACE_FOLDER_UPDATE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
