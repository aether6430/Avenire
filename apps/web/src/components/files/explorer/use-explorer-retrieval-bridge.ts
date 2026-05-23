"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkspaceSearchResult } from "@/components/files/search-model";

const FILE_RETRIEVAL_CONTEXT_KEY = "file-explorer-retrieval-context-v1";

interface UseExplorerRetrievalBridgeOptions {
  selectedRetrievalChunkParam: string | null;
  workspaceUuid: string;
}

interface StoredExplorerRetrievalContext {
  activeChunkId?: string | null;
  query?: string;
  results?: WorkspaceSearchResult[];
}

function readStoredExplorerRetrievalContext(
  storageKey: string
): StoredExplorerRetrievalContext | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StoredExplorerRetrievalContext;
  } catch {
    return null;
  }
}

export function useExplorerRetrievalBridge({
  selectedRetrievalChunkParam,
  workspaceUuid,
}: UseExplorerRetrievalBridgeOptions) {
  const [query, setQuery] = useState("");
  const [retrievalResults, setRetrievalResults] = useState<
    WorkspaceSearchResult[]
  >([]);
  const [activeRetrievalChunkId, setActiveRetrievalChunkId] = useState<
    string | null
  >(null);

  const storageKey = useMemo(
    () =>
      workspaceUuid ? `${FILE_RETRIEVAL_CONTEXT_KEY}:${workspaceUuid}` : null,
    [workspaceUuid]
  );

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    const parsed = readStoredExplorerRetrievalContext(storageKey);
    if (!parsed) {
      return;
    }

    const parsedResults = Array.isArray(parsed.results) ? parsed.results : [];
    if (typeof parsed.query === "string") {
      setQuery((current) => (current ? "" : current));
    }
    if (parsedResults.length > 0) {
      setRetrievalResults((current) => {
        if (current.length === parsedResults.length) {
          return current;
        }
        return parsedResults;
      });
      setQuery((current) => (current ? "" : current));
    }
    if (
      typeof parsed.activeChunkId === "string" ||
      parsed.activeChunkId === null
    ) {
      setActiveRetrievalChunkId((current) =>
        current === (parsed.activeChunkId ?? null)
          ? current
          : (parsed.activeChunkId ?? null)
      );
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        activeChunkId: activeRetrievalChunkId,
        query: retrievalResults.length > 0 ? query : "",
        results: retrievalResults,
      })
    );
  }, [activeRetrievalChunkId, query, retrievalResults, storageKey]);

  useEffect(() => {
    setActiveRetrievalChunkId((current) =>
      current === selectedRetrievalChunkParam
        ? current
        : selectedRetrievalChunkParam
    );
  }, [selectedRetrievalChunkParam]);

  const handleSearch = useCallback(
    (_searchQuery: string, results: WorkspaceSearchResult[]) => {
      setQuery("");
      setRetrievalResults(results);
      if (results.length === 0) {
        setActiveRetrievalChunkId(null);
      }
    },
    []
  );

  return {
    activeRetrievalChunkId,
    handleSearch,
    query,
    retrievalResults,
  };
}
