import { NextResponse } from "next/server";
import { getFolderWithAncestors, listWorkspaceFolders } from "@/lib/file-data";
import { resolveAccessibleExtensionWorkspaceContext } from "../../../extension-route-context";
import {
  resolveExtensionRouteError,
  resolveExtensionWorkspaceFolderParentId,
} from "../../../extension-route-model";

export async function handleExtensionWorkspaceFoldersRouteGet(input: {
  request: Request;
  userId: string;
  workspaceUuid: string;
}) {
  const workspaceContext = await resolveAccessibleExtensionWorkspaceContext({
    userId: input.userId,
    workspaceUuid: input.workspaceUuid,
  });
  if (!workspaceContext.success) {
    return NextResponse.json(
      { error: workspaceContext.error },
      { status: workspaceContext.status }
    );
  }

  try {
    const url = new URL(input.request.url);
    const currentParentId = resolveExtensionWorkspaceFolderParentId({
      parentId: url.searchParams.get("parentId"),
      rootFolderId: workspaceContext.workspace.rootFolderId,
    });

    const folders = await listWorkspaceFolders(
      workspaceContext.workspaceUuid,
      input.userId
    );
    const currentFolder = folders.find((entry) => entry.id === currentParentId);
    if (!currentFolder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const withAncestors = await getFolderWithAncestors(
      workspaceContext.workspaceUuid,
      currentFolder.id,
      input.userId
    );
    if (!withAncestors) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    return NextResponse.json({
      rootFolderId: workspaceContext.workspace.rootFolderId,
      currentFolder: withAncestors.folder,
      ancestors: withAncestors.ancestors,
      folders: folders.filter((entry) => entry.parentId === currentFolder.id),
    });
  } catch (error) {
    const failure = resolveExtensionRouteError(error, {
      fallback: "Unable to load extension folders.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
