import { resolveApiErrorMessage } from "@/lib/api-error-message";

export function buildWorkspaceFolderRoutePayload<
  TFile extends { id: string },
>(input: {
  ancestors: unknown[];
  files: TFile[];
  folder: unknown;
  folders: unknown[];
  ingestionFlags: Record<string, boolean>;
  noteContentByFileId: Map<string, string | null>;
}) {
  return {
    folder: input.folder,
    ancestors: input.ancestors,
    folders: input.folders,
    files: input.files.map((file) => ({
      ...file,
      isIngested: input.ingestionFlags[file.id] ?? false,
      noteContent: input.noteContentByFileId.get(file.id) ?? null,
    })),
  };
}

export const WORKSPACE_FOLDER_LOAD_ERROR = "Unable to load folder.";
export const WORKSPACE_FOLDER_UPDATE_ERROR = "Unable to update folder.";
export const WORKSPACE_FOLDER_DELETE_ERROR = "Unable to delete folder.";

export function collectWorkspaceFolderTreeChangedParentIds(
  oldParentId: string | null,
  nextParentId: string | null
) {
  return [...new Set([oldParentId, nextParentId].filter(Boolean))] as string[];
}

export function canManageWorkspaceFolderRole(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}

export function resolveWorkspaceFolderRouteError(
  error: unknown,
  fallback: string
) {
  return resolveApiErrorMessage(error, fallback);
}
