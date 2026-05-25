"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  mapWorkspaceRetrievalResults,
  queryWorkspaceRetrievalApi,
  resolveWorkspaceRetrievalError,
  type WorkspaceSearchItem,
  type WorkspaceSearchResult,
} from "@/components/files/search-model";

interface UseStylizedSearchBarProps {
  focusSignal?: number;
  initialQuery?: string;
  initialResults?: WorkspaceSearchResult[];
  items: WorkspaceSearchItem[];
  onApplyWorkspaceFilter?: (itemIds: string[] | null) => void;
  onSearch?: (query: string, results: WorkspaceSearchResult[]) => void;
  workspaceUuid: string;
}

export function useStylizedSearchBar({
  focusSignal,
  initialQuery = "",
  initialResults = [],
  items,
  onApplyWorkspaceFilter,
  onSearch,
  workspaceUuid,
}: UseStylizedSearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] =
    useState<WorkspaceSearchResult[]>(initialResults);
  const [retrievalError, setRetrievalError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const latestSearchRequestRef = useRef(0);
  const previousQueryRef = useRef(initialQuery);
  const onSearchRef = useRef(onSearch);
  const onApplyWorkspaceFilterRef = useRef(onApplyWorkspaceFilter);

  useEffect(() => {
    onSearchRef.current = onSearch;
    onApplyWorkspaceFilterRef.current = onApplyWorkspaceFilter;
  }, [onApplyWorkspaceFilter, onSearch]);

  useEffect(() => {
    if (focusSignal === undefined) {
      return;
    }

    const input = containerRef.current?.querySelector<HTMLInputElement>(
      '[data-slot="command-input"]'
    );
    input?.focus();
  }, [focusSignal]);

  useEffect(() => {
    const trimmed = query.trim();
    const previousTrimmed = previousQueryRef.current.trim();
    previousQueryRef.current = query;

    if (trimmed.length > 0 || previousTrimmed.length === 0) {
      return;
    }

    latestSearchRequestRef.current += 1;
    setResults([]);
    setRetrievalError(null);
    setIsSearching(false);
    onApplyWorkspaceFilterRef.current?.(null);
    onSearchRef.current?.("", []);
  }, [query]);

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        latestSearchRequestRef.current += 1;
        setResults([]);
        setRetrievalError(null);
        setIsSearching(false);
        onApplyWorkspaceFilter?.(null);
        onSearch?.("", []);
        return;
      }

      const requestId = latestSearchRequestRef.current + 1;
      latestSearchRequestRef.current = requestId;
      setIsSearching(true);
      setRetrievalError(null);

      let vectorResults: WorkspaceSearchResult[];
      try {
        vectorResults = mapWorkspaceRetrievalResults({
          items,
          results: await queryWorkspaceRetrievalApi({
            query: trimmed,
            workspaceUuid,
          }),
        });
      } catch (error) {
        if (requestId !== latestSearchRequestRef.current) {
          return;
        }

        setResults([]);
        setIsSearching(false);
        setRetrievalError(resolveWorkspaceRetrievalError(error));
        onApplyWorkspaceFilter?.(null);
        onSearch?.(trimmed, []);
        return;
      }

      if (requestId !== latestSearchRequestRef.current) {
        return;
      }

      const itemIds = Array.from(
        new Set(vectorResults.map((result) => result.fileId ?? result.id))
      );

      setResults(vectorResults);
      setIsSearching(false);
      onApplyWorkspaceFilter?.(itemIds);
      onSearch?.(trimmed, vectorResults);
    },
    [items, onApplyWorkspaceFilter, onSearch, workspaceUuid]
  );

  const triggerSearch = useCallback(
    (searchQuery: string) => {
      handleSearch(searchQuery).catch(() => undefined);
    },
    [handleSearch]
  );

  return {
    containerRef,
    isSearching,
    query,
    retrievalError,
    results,
    setQuery,
    triggerSearch,
    workspaceUuid,
  };
}

export type StylizedSearchBarRuntime = ReturnType<typeof useStylizedSearchBar>;
