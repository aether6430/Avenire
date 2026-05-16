import { NextResponse } from "next/server";
import {
  isSharedFilesVirtualFolderId,
  userCanEditFolder,
  userCanViewFolder,
} from "@/lib/file-data";
import { getSessionUser } from "@/lib/workspace";
import { handleWorkspaceFolderDelete } from "./workspace-folder-route-delete";
import { handleWorkspaceFolderGet } from "./workspace-folder-route-get";
import { handleWorkspaceFolderUpdate } from "./workspace-folder-route-update";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string; folderUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid, folderUuid } = await context.params;
  const canView = await userCanViewFolder({
    workspaceId: workspaceUuid,
    folderId: folderUuid,
    userId: user.id,
  });
  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return await handleWorkspaceFolderGet({
    folderUuid,
    userId: user.id,
    workspaceUuid,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string; folderUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid, folderUuid } = await context.params;
  const canEdit = await userCanEditFolder({
    workspaceId: workspaceUuid,
    folderId: folderUuid,
    userId: user.id,
  });
  if (!canEdit) {
    return NextResponse.json({ error: "Read-only folder" }, { status: 403 });
  }
  if (isSharedFilesVirtualFolderId(folderUuid, workspaceUuid)) {
    return NextResponse.json(
      { error: "Shared Files is read-only" },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    bannerUrl?: string | null;
    iconColor?: string | null;
    name?: string;
    parentId?: string | null;
  };
  return await handleWorkspaceFolderUpdate({
    body,
    folderUuid,
    userId: user.id,
    workspaceUuid,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string; folderUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid, folderUuid } = await context.params;
  const canEdit = await userCanEditFolder({
    workspaceId: workspaceUuid,
    folderId: folderUuid,
    userId: user.id,
  });
  if (!canEdit) {
    return NextResponse.json({ error: "Read-only folder" }, { status: 403 });
  }
  if (isSharedFilesVirtualFolderId(folderUuid, workspaceUuid)) {
    return NextResponse.json(
      { error: "Shared Files is read-only" },
      { status: 400 }
    );
  }
  return await handleWorkspaceFolderDelete({
    folderUuid,
    userId: user.id,
    workspaceUuid,
  });
}
