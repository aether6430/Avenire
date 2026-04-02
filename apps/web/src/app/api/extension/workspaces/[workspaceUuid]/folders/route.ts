import { NextResponse } from "next/server";
import { getFolderWithAncestors, listWorkspaceFolders, listWorkspacesForUser, userCanAccessWorkspace } from "@/lib/file-data";
import { getSessionUser } from "@/lib/workspace";

export async function GET(
  request: Request,
  contextParams: { params: Promise<{ workspaceUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid } = await contextParams.params;
  const canAccess = await userCanAccessWorkspace(user.id, workspaceUuid);
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const summaries = await listWorkspacesForUser(user.id);
  const workspace = summaries.find((entry) => entry.workspaceId === workspaceUuid);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const currentParentId = url.searchParams.get("parentId") ?? workspace.rootFolderId;
  const folders = await listWorkspaceFolders(workspaceUuid, user.id);
  const currentFolder = folders.find((entry) => entry.id === currentParentId);
  if (!currentFolder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const withAncestors = await getFolderWithAncestors(
    workspaceUuid,
    currentFolder.id,
    user.id
  );
  if (!withAncestors) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  return NextResponse.json({
    rootFolderId: workspace.rootFolderId,
    currentFolder: withAncestors.folder,
    ancestors: withAncestors.ancestors,
    folders: folders.filter((entry) => entry.parentId === currentFolder.id),
  });
}
