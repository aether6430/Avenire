import type { listWorkspaceFiles, listWorkspaceFolders } from "@/lib/file-data";

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
