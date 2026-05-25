"use client";

import { useMemo } from "react";
import { buildExplorerWorkspaceIndexState } from "@/components/files/explorer/explorer-workspace-index-state-model";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";

export function useExplorerWorkspaceIndexState({
  allFiles,
  allFolders,
}: {
  allFiles: FileRecord[];
  allFolders: FolderRecord[];
}) {
  return useMemo(
    () =>
      buildExplorerWorkspaceIndexState({
        allFiles,
        allFolders,
      }),
    [allFiles, allFolders]
  );
}
