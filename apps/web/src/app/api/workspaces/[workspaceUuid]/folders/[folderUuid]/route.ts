import { NextResponse } from "next/server";
import {
  isSharedFilesVirtualFolderId,
  userCanEditFolder,
  userCanViewFolder,
} from "@/lib/file-data";
import { getSessionUser } from "@/lib/workspace";
import { handleWorkspaceFolderDelete } from "./workspace-folder-route-delete";
import { handleWorkspaceFolderGet } from "./workspace-folder-route-get";
import {
  resolveWorkspaceFolderRouteError,
  WORKSPACE_FOLDER_DELETE_ERROR,
  WORKSPACE_FOLDER_LOAD_ERROR,
  WORKSPACE_FOLDER_UPDATE_ERROR,
  workspaceFolderPatchSchema,
} from "./workspace-folder-route-model";
import { parseJsonRequest } from "@/lib/api-request";
import { handleWorkspaceFolderUpdate } from "./workspace-folder-route-update";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string; folderUuid: string }> }
) {
  try {
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
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFolderRouteError(
          error,
          WORKSPACE_FOLDER_LOAD_ERROR
        ),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string; folderUuid: string }> }
) {
  try {
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

    const parsed = await parseJsonRequest(request, workspaceFolderPatchSchema);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const body = parsed.data;
    return await handleWorkspaceFolderUpdate({
      body,
      folderUuid,
      userId: user.id,
      workspaceUuid,
    });
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string; folderUuid: string }> }
) {
  try {
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
