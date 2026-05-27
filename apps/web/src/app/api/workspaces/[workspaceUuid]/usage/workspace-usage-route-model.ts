import { resolveApiErrorMessage } from "@/lib/api-error-message";

import type { ExplorerFileRecord } from "@/lib/file-data";

type ExplorerFolderRecord = Awaited<
  ReturnType<typeof import("@/lib/file-data").listWorkspaceFolders>
>[number];
type WorkspaceMemberRecord = Awaited<
  ReturnType<typeof import("@/lib/file-data").listWorkspaceMembers>
>[number];

export const WORKSPACE_USAGE_LOAD_ERROR = "Unable to load workspace stats.";

export function countIndexedWorkspaceFiles(
  files: Pick<ExplorerFileRecord, "id">[],
  ingestionFlags: Record<string, boolean>
) {
  return files.reduce(
    (count, file) => count + (ingestionFlags[file.id] ? 1 : 0),
    0
  );
}

export function buildWorkspaceUsagePayload(input: {
  files: Pick<ExplorerFileRecord, "id" | "sizeBytes">[];
  folders: ExplorerFolderRecord[];
  ingestionFlags: Record<string, boolean>;
  members: WorkspaceMemberRecord[];
}) {
  const fileCount = input.files.length;
  const indexedFileCount = countIndexedWorkspaceFiles(
    input.files,
    input.ingestionFlags
  );

  return {
    usage: {
      fileCount,
      folderCount: input.folders.length,
      indexedFileCount,
      memberCount: input.members.length,
      pendingIngestionCount: Math.max(0, fileCount - indexedFileCount),
      totalSizeBytes: input.files.reduce(
        (total, file) => total + file.sizeBytes,
        0
      ),
    },
  };
}

export function resolveWorkspaceUsageRouteError(
  error: unknown,
  fallback: string
) {
  return resolveApiErrorMessage(error, fallback);
}
