"use client";

import { useCallback, useMemo, useState } from "react";
import {
  buildExplorerFilePreviewRetrievalProps,
  buildExplorerSearchBarProps,
  type ExplorerFilePreviewRetrievalProps,
  type ExplorerSearchBarProps,
} from "@/components/files/explorer/explorer-retrieval-props";
import { useExplorerRetrievalBridge } from "@/components/files/explorer/use-explorer-retrieval-bridge";
import type { WorkspaceSearchItem } from "@/components/files/search-model";

interface UseExplorerSearchSurfaceOptions {
  selectedRetrievalChunkParam: string | null;
  workspaceUuid: string;
}

interface GetExplorerSearchBarPropsOptions {
  focusSearchSignal: number;
  searchableItems: WorkspaceSearchItem[];
}

export function useExplorerSearchSurface({
  selectedRetrievalChunkParam,
  workspaceUuid,
}: UseExplorerSearchSurfaceOptions) {
  const [vectorFilteredIds, setVectorFilteredIds] =
    useState<Set<string> | null>(null);
  const { activeRetrievalChunkId, handleSearch, query, retrievalResults } =
    useExplorerRetrievalBridge({
      selectedRetrievalChunkParam,
      workspaceUuid,
    });

  const handleApplyWorkspaceFilter = useCallback((itemIds: string[] | null) => {
    setVectorFilteredIds(itemIds ? new Set(itemIds) : null);
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
      searchableItems,
    }: GetExplorerSearchBarPropsOptions): ExplorerSearchBarProps =>
      buildExplorerSearchBarProps({
        focusSearchSignal,
        handleApplyWorkspaceFilter,
        handleSearch,
        query,
        retrievalResults,
        searchableItems,
        workspaceUuid,
      }),
    [
      handleApplyWorkspaceFilter,
      handleSearch,
      query,
      retrievalResults,
      workspaceUuid,
    ]
  );

  return {
    filePreviewRetrievalProps,
    getSearchBarProps,
    query,
    retrievalResults,
    vectorFilteredIds,
  };
}
