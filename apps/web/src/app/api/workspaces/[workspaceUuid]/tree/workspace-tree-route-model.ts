import type { listWorkspaceFiles, listWorkspaceFolders } from "@/lib/file-data";

export const WORKSPACE_TREE_LOAD_ERROR = "Unable to load files.";

export function buildWorkspaceTreeRoutePayload(input: {
  files: Awaited<ReturnType<typeof listWorkspaceFiles>>;
  folders: Awaited<ReturnType<typeof listWorkspaceFolders>>;
  ingestionFlags: Record<string, boolean>;
}) {
  return {
    folders: input.folders,
    files: input.files.map((file) => ({
      ...file,
      isIngested: input.ingestionFlags[file.id] ?? false,
    })),
  };
}

export function resolveWorkspaceTreeRouteError(
  error: unknown,
  fallback: string
) {
  return error instanceof Error ? error.message : fallback;
}
