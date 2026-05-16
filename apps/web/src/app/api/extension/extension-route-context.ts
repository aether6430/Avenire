import { getExtensionDestinationPreset } from "@avenire/database";
import {
  listWorkspaceFolders,
  listWorkspacesForUser,
  userCanAccessWorkspace,
  userCanEditFolder,
} from "@/lib/file-data";
import { normalizeExtensionRouteUuidInput } from "./extension-route-model";

export async function resolveAccessibleExtensionWorkspaceContext(input: {
  userId: string;
  workspaceUuid: string;
}) {
  const workspaceUuid = normalizeExtensionRouteUuidInput(input.workspaceUuid);
  const canAccess = await userCanAccessWorkspace(input.userId, workspaceUuid);
  if (!canAccess) {
    return {
      success: false as const,
      error: "Forbidden",
      status: 403,
    };
  }

  const summaries = await listWorkspacesForUser(input.userId);
  const workspace = summaries.find(
    (entry) => entry.workspaceId === workspaceUuid
  );
  if (!workspace) {
    return {
      success: false as const,
      error: "Workspace not found",
      status: 404,
    };
  }

  return {
    success: true as const,
    workspace,
    workspaceUuid,
  };
}

export async function resolveExtensionDestinationWorkspaceFolderContext(input: {
  folderId: string;
  userId: string;
  workspaceId: string;
}) {
  const summaries = await listWorkspacesForUser(input.userId);
  const workspace = summaries.find(
    (entry) => entry.workspaceId === input.workspaceId
  );
  if (!workspace) {
    return {
      success: false as const,
      error: "Workspace not found",
      status: 404,
    };
  }

  const canEdit = await userCanEditFolder({
    workspaceId: workspace.workspaceId,
    folderId: input.folderId,
    userId: input.userId,
  });
  if (!canEdit) {
    return {
      success: false as const,
      error: "Read-only folder",
      status: 403,
    };
  }

  const folders = await listWorkspaceFolders(
    workspace.workspaceId,
    input.userId
  );
  const folder = folders.find((entry) => entry.id === input.folderId);
  if (!folder) {
    return {
      success: false as const,
      error: "Folder not found",
      status: 404,
    };
  }

  return {
    success: true as const,
    folder,
    workspace,
  };
}

export async function getOwnedExtensionDestinationPreset(input: {
  presetId: string;
  userId: string;
}) {
  const presetId = normalizeExtensionRouteUuidInput(input.presetId);
  const destination = await getExtensionDestinationPreset({
    presetId,
    userId: input.userId,
  });
  if (!destination) {
    return {
      success: false as const,
      error: "Destination not found",
      status: 404,
    };
  }

  return {
    success: true as const,
    destination,
    presetId,
  };
}
