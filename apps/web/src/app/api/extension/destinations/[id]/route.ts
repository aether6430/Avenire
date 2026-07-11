import {
  deleteExtensionDestinationPreset,
  getExtensionDestinationPreset,
  updateExtensionDestinationPreset,
} from "@avenire/database";
import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api-request";
import {
  listWorkspaceFolders,
  listWorkspacesForUser,
  userCanEditFolder,
} from "@/lib/file-data";
import { getSessionUser } from "@/lib/workspace";
import { extensionDestinationRequestSchema } from "../../extension-route-contracts";

export async function PATCH(
  request: Request,
  contextParams: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await contextParams.params;
  const existing = await getExtensionDestinationPreset({
    presetId: id,
    userId: user.id,
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Destination not found" },
      { status: 404 }
    );
  }

  const parsed = await parseJsonRequest(request, extensionDestinationRequestSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const summaries = await listWorkspacesForUser(user.id);
  const workspace = summaries.find(
    (entry) => entry.workspaceId === parsed.data.workspaceId
  );
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const canEdit = await userCanEditFolder({
    workspaceId: workspace.workspaceId,
    folderId: parsed.data.folderId,
    userId: user.id,
  });
  if (!canEdit) {
    return NextResponse.json({ error: "Read-only folder" }, { status: 403 });
  }

  const folders = await listWorkspaceFolders(workspace.workspaceId, user.id);
  const folder = folders.find((entry) => entry.id === parsed.data.folderId);
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const destination = await updateExtensionDestinationPreset({
    presetId: existing.id,
    userId: user.id,
    workspaceId: workspace.workspaceId,
    organizationId: workspace.organizationId,
    folderId: folder.id,
    label: parsed.data.label ?? folder.name,
    workspaceName: workspace.name,
    folderName: folder.name,
  });

  if (!destination) {
    return NextResponse.json(
      { error: "Destination not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    destination: {
      ...destination,
      createdAt: destination.createdAt.toISOString(),
      updatedAt: destination.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(
  _request: Request,
  contextParams: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await contextParams.params;
  const deleted = await deleteExtensionDestinationPreset({
    presetId: id,
    userId: user.id,
  });
  if (!deleted) {
    return NextResponse.json(
      { error: "Destination not found" },
      { status: 404 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
