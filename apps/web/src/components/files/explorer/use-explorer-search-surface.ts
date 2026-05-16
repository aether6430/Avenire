"use client";

import { useCallback, useMemo, useState } from "react";
import {
  buildExplorerFilePreviewRetrievalProps,
  buildExplorerSearchBarProps,
  type ExplorerFilePreviewRetrievalProps,
  type ExplorerSearchBarProps,
} from "@/components/files/explorer/explorer-retrieval-props";
import { useExplorerRetrievalBridge } from "@/components/files/explorer/use-explorer-retrieval-bridge";
import type {
  WorkspaceSearchItem,
  WorkspaceSearchResult,
} from "@/components/files/search-model";

interface UseExplorerSearchSurfaceOptions {
  onOpenFolderById: (folderId: string) => void;
  onOpenSearchResult: (result: WorkspaceSearchResult) => void;
  selectedRetrievalChunkParam: string | null;
  workspaceUuid: string;
}

interface GetExplorerSearchBarPropsOptions {
  focusSearchSignal: number;
  onOpenFileById: NonNullable<ExplorerSearchBarProps["onOpenFileById"]>;
  onOpenFolderById: NonNullable<ExplorerSearchBarProps["onOpenFolderById"]>;
  searchableItems: WorkspaceSearchItem[];
}

export function useExplorerSearchSurface({
  onOpenFolderById,
  onOpenSearchResult,
  selectedRetrievalChunkParam,
  workspaceUuid,
}: UseExplorerSearchSurfaceOptions) {
  const [vectorFilteredIds, setVectorFilteredIds] =
    useState<Set<string> | null>(null);
  const {
    activeRetrievalChunkId,
    handleSearch,
    handleSelectResult,
    query,
    retrievalResults,
  } = useExplorerRetrievalBridge({
    openFolderById: onOpenFolderById,
    openSearchResult: onOpenSearchResult,
    selectedRetrievalChunkParam,
    workspaceUuid,
  });

  const handleApplyWorkspaceFilter = useCallback((itemIds: string[] | null) => {
    setVectorFilteredIds(
      itemIds && itemIds.length > 0 ? new Set(itemIds) : null
    );
  }, []);

  const filePreviewRetrievalProps: ExplorerFilePreviewRetrievalProps = useMemo(
    () =>
      buildExplorerFilePreviewRetrievalProps({
        activeRetrievalChunkId,
        query,
        retrievalResults,
      }),
    [activeRetrievalChunkId, query, retrievalResults]
  );

  const getSearchBarProps = useCallback(
    ({
      focusSearchSignal,
      onOpenFileById,
      onOpenFolderById,
      searchableItems,
    }: GetExplorerSearchBarPropsOptions): ExplorerSearchBarProps =>
      buildExplorerSearchBarProps({
        activeRetrievalChunkId,
        focusSearchSignal,
        handleApplyWorkspaceFilter,
        handleSearch,
        handleSelectResult,
        onOpenFileById,
        onOpenFolderById,
        query,
        retrievalResults,
        searchableItems,
        workspaceUuid,
      }),
    [
      activeRetrievalChunkId,
      handleApplyWorkspaceFilter,
      handleSearch,
      handleSelectResult,
      query,
      retrievalResults,
      workspaceUuid,
    ]
  );

  return {
    filePreviewRetrievalProps,
    getSearchBarProps,
    query,
    vectorFilteredIds,
  };
}
