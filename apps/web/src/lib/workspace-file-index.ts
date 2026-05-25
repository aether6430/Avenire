import type {
  WorkspaceTreeFileLike,
  WorkspaceTreeFolderLike,
  WorkspaceTreePayload,
} from "@/lib/workspace-tree-client";
import {
  buildWorkspaceTreeFileIndex,
  createWorkspaceTreePathResolver,
} from "@/lib/workspace-tree-read-model";

export interface WorkspaceFileIndexEntry<
  TFile extends WorkspaceTreeFileLike = WorkspaceTreeFileLike,
> {
  file: TFile;
  nameLower: string;
  parentPath: string;
  pathLower: string;
  workspacePath: string;
}

export interface WorkspaceFileIndex<
  TFolder extends WorkspaceTreeFolderLike = WorkspaceTreeFolderLike,
  TFile extends WorkspaceTreeFileLike = WorkspaceTreeFileLike,
> {
  filePathById: Map<string, string>;
  files: WorkspaceFileIndexEntry<TFile>[];
  folderPathById: Map<string, string>;
}

export function createWorkspaceFileIndex<
  TFolder extends WorkspaceTreeFolderLike,
  TFile extends WorkspaceTreeFileLike,
>(
  input: WorkspaceTreePayload<TFolder, TFile>
): WorkspaceFileIndex<TFolder, TFile> {
  const resolver = createWorkspaceTreePathResolver(input);
  const files = buildWorkspaceTreeFileIndex(input).map(
    ({ file, parentPath, workspacePath }) => ({
      file,
      nameLower: file.name.toLowerCase(),
      parentPath,
      pathLower: workspacePath.toLowerCase(),
      workspacePath,
    })
  );

  return {
    filePathById: new Map(
      files.map(({ file, workspacePath }) => [file.id, workspacePath] as const)
    ),
    files,
    folderPathById: new Map(
      input.folders.map((folder) => [
        folder.id,
        resolver.resolveFolderPath(folder.id) || folder.name,
      ])
    ),
  };
}
