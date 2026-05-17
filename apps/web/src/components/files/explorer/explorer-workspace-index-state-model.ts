import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import {
  createWorkspaceSearchItems,
  type WorkspaceSearchItem,
} from "@/components/files/search-model";
import type { WorkspaceFileIndex } from "@/lib/workspace-file-index";
import { createWorkspaceFileIndex } from "@/lib/workspace-file-index";

export function buildExplorerWorkspaceIndexState(input: {
  allFiles: FileRecord[];
  allFolders: FolderRecord[];
}): {
  filePathById: Map<string, string>;
  searchableItems: WorkspaceSearchItem[];
  workspaceFileIndex: WorkspaceFileIndex<FolderRecord, FileRecord>;
} {
  const workspaceFileIndex = createWorkspaceFileIndex({
    files: input.allFiles,
    folders: input.allFolders,
  });

  return {
    filePathById: workspaceFileIndex.filePathById,
    searchableItems: createWorkspaceSearchItems({
      files: input.allFiles,
      folders: input.allFolders,
      workspaceFileIndex,
    }),
    workspaceFileIndex,
  };
}
