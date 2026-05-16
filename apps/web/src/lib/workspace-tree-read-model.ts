import type {
  WorkspaceTreeFileLike,
  WorkspaceTreeFolderLike,
  WorkspaceTreePayload,
} from "@/lib/workspace-tree-client";

export interface WorkspaceTreeIndexedFile<
  TFile extends WorkspaceTreeFileLike = WorkspaceTreeFileLike,
> {
  file: TFile;
  parentPath: string;
  workspacePath: string;
}

export function createWorkspaceTreePathResolver<
  TFolder extends WorkspaceTreeFolderLike,
  TFile extends WorkspaceTreeFileLike,
>(input: WorkspaceTreePayload<TFolder, TFile>) {
  const folderById = new Map(
    input.folders.map((folder) => [folder.id, folder])
  );
  const folderPathCache = new Map<string, string>();

  const resolveFolderPath = (folderId: string | null): string => {
    if (!folderId) {
      return "";
    }

    const cached = folderPathCache.get(folderId);
    if (cached !== undefined) {
      return cached;
    }

    const segments: string[] = [];
    const seen = new Set<string>();
    let cursor: string | null = folderId;

    while (cursor) {
      if (seen.has(cursor)) {
        break;
      }

      seen.add(cursor);
      const folder = folderById.get(cursor);
      if (!folder || folder.parentId === null) {
        break;
      }

      segments.push(folder.name);
      cursor = folder.parentId;
    }

    const resolvedPath = segments.reverse().join("/");
    folderPathCache.set(folderId, resolvedPath);
    return resolvedPath;
  };

  const getWorkspacePathForFile = (file: TFile) => {
    const parentPath = resolveFolderPath(file.folderId);
    return parentPath ? `${parentPath}/${file.name}` : file.name;
  };

  const findFileByWorkspacePath = (workspacePath: string) =>
    input.files.find(
      (file) => getWorkspacePathForFile(file) === workspacePath
    ) ?? null;

  return {
    findFileByWorkspacePath,
    getWorkspacePathForFile,
    resolveFolderPath,
  };
}

export function buildWorkspaceTreeFileIndex<
  TFolder extends WorkspaceTreeFolderLike,
  TFile extends WorkspaceTreeFileLike,
>(
  input: WorkspaceTreePayload<TFolder, TFile>
): WorkspaceTreeIndexedFile<TFile>[] {
  const resolver = createWorkspaceTreePathResolver(input);

  return input.files
    .map((file) => {
      const parentPath = resolver.resolveFolderPath(file.folderId);
      return {
        file,
        parentPath,
        workspacePath: resolver.getWorkspacePathForFile(file),
      };
    })
    .sort((left, right) =>
      left.workspacePath.localeCompare(right.workspacePath, undefined, {
        sensitivity: "base",
      })
    );
}
