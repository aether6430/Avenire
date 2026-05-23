"use client";

import { useMemo } from "react";
import { buildExplorerCurrentSurface } from "@/components/files/explorer/explorer-derived-state-model";
import type { PropertyFilterState } from "@/components/files/explorer/explorer-file-properties-model";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import {
  buildWorkspaceFolderBrowseModel,
  type SortState,
} from "@/components/files/explorer/workspace-folder-browse-model";

interface UseExplorerDerivedStateOptions {
  allFiles: FileRecord[];
  allFolders: FolderRecord[];
  breadcrumbs: FolderRecord[];
  files: FileRecord[];
  folders: FolderRecord[];
  propertyFilters: PropertyFilterState[];
  query: string;
  selectedFileParam: string | null;
  sortState: SortState;
  vectorFilteredIds: Set<string> | null;
  workspaceName: string;
}

export function useExplorerDerivedState({
  allFiles,
  allFolders,
  breadcrumbs,
  files,
  folders,
  propertyFilters,
  query,
  selectedFileParam,
  sortState,
  vectorFilteredIds,
  workspaceName,
}: UseExplorerDerivedStateOptions) {
  const currentSurface = useMemo(
    () =>
      buildExplorerCurrentSurface({
        breadcrumbs,
        files,
        selectedFileParam,
        workspaceName,
      }),
    [breadcrumbs, files, selectedFileParam, workspaceName]
  );

  const browseState = useMemo(
    () =>
      buildWorkspaceFolderBrowseModel({
        allFiles,
        allFolders,
        files,
        folders,
        propertyFilters,
        query,
        sortState,
        vectorFilteredIds,
      }),
    [
      allFiles,
      allFolders,
      files,
      folders,
      propertyFilters,
      query,
      sortState,
      vectorFilteredIds,
    ]
  );

  return {
    ...browseState,
    ...currentSurface,
  };
}
