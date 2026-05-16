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
        files,
        folders,
        propertyFilters,
        query,
        sortState,
        vectorFilteredIds,
      }),
    [files, folders, propertyFilters, query, sortState, vectorFilteredIds]
  );

  return {
    ...browseState,
    ...currentSurface,
  };
}
