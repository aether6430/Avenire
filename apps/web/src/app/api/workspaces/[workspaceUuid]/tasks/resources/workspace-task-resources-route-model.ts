import { resolveApiErrorMessage } from "@/lib/api-error-message";

import type { listChatsForUser } from "@avenire/database";
import type { listWorkspaceFiles, listWorkspaceFolders } from "@/lib/file-data";
import type { WorkspaceTaskResourceOption } from "@/lib/tasks";

export const WORKSPACE_TASK_RESOURCES_LOAD_ERROR =
  "Unable to load task resources.";

export function normalizeWorkspaceTaskResourcesQuery(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function buildWorkspaceTaskFileOption(
  workspaceUuid: string,
  file: Awaited<ReturnType<typeof listWorkspaceFiles>>[number]
): WorkspaceTaskResourceOption {
  return {
    href: `/workspace/files/${workspaceUuid}/folder/${file.folderId}?file=${file.id}`,
    resourceId: file.id,
    resourceType: "file",
    subtitle: file.folderId ? "File" : null,
    title: file.name,
  };
}

export function buildWorkspaceTaskFolderOption(
  workspaceUuid: string,
  folder: Awaited<ReturnType<typeof listWorkspaceFolders>>[number]
): WorkspaceTaskResourceOption {
  return {
    href: `/workspace/files/${workspaceUuid}/folder/${folder.id}`,
    resourceId: folder.id,
    resourceType: "folder",
    subtitle: folder.parentId ? "Folder" : "Workspace root",
    title: folder.name,
  };
}

export function buildWorkspaceTaskChatOption(
  chat: Awaited<ReturnType<typeof listChatsForUser>>[number]
): WorkspaceTaskResourceOption {
  return {
    href: `/workspace/chats/${chat.slug}`,
    resourceId: chat.slug,
    resourceType: "chat",
    subtitle: "Method",
    title: chat.title,
  };
}

export function filterWorkspaceTaskResourceOptions(
  options: WorkspaceTaskResourceOption[],
  query: string
) {
  if (!query) {
    return options;
  }

  return options.filter((item) =>
    [item.title, item.subtitle ?? "", item.resourceId]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
}

export function resolveWorkspaceTaskResourcesRouteError(
  error: unknown,
  fallback: string
) {
  return resolveApiErrorMessage(error, fallback);
}
