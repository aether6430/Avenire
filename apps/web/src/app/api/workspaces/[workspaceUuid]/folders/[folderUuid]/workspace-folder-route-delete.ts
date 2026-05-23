import { NextResponse } from "next/server";
import { invalidateWorkspaceReadCaches } from "@/lib/domain-cache";
import {
  isSharedFilesVirtualFolderId,
  listWorkspaceMembers,
  softDeleteFolder,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import {
  canManageWorkspaceFolderRole,
  resolveWorkspaceFolderRouteError,
  WORKSPACE_FOLDER_DELETE_ERROR,
} from "./workspace-folder-route-model";

export async function handleWorkspaceFolderDelete(input: {
  folderUuid: string;
  userId: string;
  workspaceUuid: string;
}) {
  try {
    if (isSharedFilesVirtualFolderId(input.folderUuid, input.workspaceUuid)) {
      return NextResponse.json(
        { error: "Shared Files is read-only" },
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

    const deletedFolder = await softDeleteFolder(
      input.workspaceUuid,
      input.folderUuid
    );
    if (!deletedFolder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    await publishFilesInvalidationEvent({
      workspaceUuid: input.workspaceUuid,
      folderId: input.folderUuid,
      reason: "folder.deleted",
    });
    await publishFilesInvalidationEvent({
      workspaceUuid: input.workspaceUuid,
      reason: "tree.changed",
    });
    await invalidateWorkspaceReadCaches(input.workspaceUuid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFolderRouteError(
          error,
          WORKSPACE_FOLDER_DELETE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
