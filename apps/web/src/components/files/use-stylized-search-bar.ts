"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  findFastWorkspaceSearchMatch,
  mapWorkspaceRetrievalResults,
  queryWorkspaceRetrievalApi,
  resolveWorkspaceRetrievalError,
  type WorkspaceSearchItem,
  type WorkspaceSearchResult,
} from "@/components/files/search-model";
import {
  getMessageTextContent,
  toFastResult,
  toResultKey,
} from "@/components/files/stylized-search-bar-model";

interface UseStylizedSearchBarProps {
  focusSignal?: number;
  initialQuery?: string;
  initialResults?: WorkspaceSearchResult[];
  items: WorkspaceSearchItem[];
  onApplyWorkspaceFilter?: (itemIds: string[] | null) => void;
  onOpenFileById?: (fileId: string) => void;
  onOpenFolderById?: (folderId: string) => void;
  onSearch?: (query: string, results: WorkspaceSearchResult[]) => void;
  onSelectResult?: (result: WorkspaceSearchResult) => void;
  selectedResultChunkId?: string | null;
  workspaceUuid: string;
}

export function useStylizedSearchBar({
  focusSignal,
  initialQuery = "",
  initialResults = [],
  items,
  onApplyWorkspaceFilter,
  onOpenFileById,
  onOpenFolderById,
  onSearch,
  onSelectResult,
  selectedResultChunkId,
  workspaceUuid,
}: UseStylizedSearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(
    initialQuery.trim().length > 0 && initialResults.length > 0
  );
  const [results, setResults] =
    useState<WorkspaceSearchResult[]>(initialResults);
  const [retrievalError, setRetrievalError] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<string>(
    selectedResultChunkId ??
      (initialResults[0] ? toResultKey(initialResults[0]) : "")
  );
  const [aiSummary, setAiSummary] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const latestSearchRequestRef = useRef(0);
  const aiSummaryRef = useRef(aiSummary);
  const previousQueryRef = useRef(initialQuery);
  const onSearchRef = useRef(onSearch);
  const onApplyWorkspaceFilterRef = useRef(onApplyWorkspaceFilter);

  const {
    messages: summaryMessages,
    sendMessage: sendSummaryMessage,
    setMessages: setSummaryMessages,
    status: summaryStatus,
    stop: stopSummary,
  } = useChat<UIMessage>({
    id: `retrieval-summary-${workspaceUuid}`,
    transport: new TextStreamChatTransport({
      api: "/api/ai/retrieval/summary",
    }),
  });
  const summaryApiRef = useRef({
    setMessages: setSummaryMessages,
    stop: stopSummary,
  });

  useEffect(() => {
    summaryApiRef.current = {
      setMessages: setSummaryMessages,
      stop: stopSummary,
    };
  }, [setSummaryMessages, stopSummary]);

  const clearSummaryConversation = useCallback(() => {
    summaryApiRef.current.stop();
    summaryApiRef.current.setMessages((previous) =>
      previous.length === 0 ? previous : []
    );
  }, []);

  const latestSummaryText = useMemo(() => {
    const assistant = [...summaryMessages]
      .reverse()
      .find((message) => message.role === "assistant");
    return getMessageTextContent(assistant);
  }, [summaryMessages]);

  useEffect(() => {
    aiSummaryRef.current = aiSummary;
  }, [aiSummary]);

  useEffect(() => {
    onSearchRef.current = onSearch;
    onApplyWorkspaceFilterRef.current = onApplyWorkspaceFilter;
  }, [onApplyWorkspaceFilter, onSearch]);

  useEffect(() => {
    if (!latestSummaryText) {
      return;
    }
    setAiSummary(latestSummaryText);
  }, [latestSummaryText]);

  const isSummaryStreaming =
    summaryStatus === "submitted" || summaryStatus === "streaming";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    const externalSelected =
      selectedResultChunkId && results.length > 0
        ? results.find((result) => result.chunkId === selectedResultChunkId)
        : null;
    if (externalSelected) {
      setSelectedValue(toResultKey(externalSelected));
    }
  }, [results, selectedResultChunkId]);

  useEffect(() => {
    const trimmed = query.trim();
    const previousTrimmed = previousQueryRef.current.trim();
    previousQueryRef.current = query;

    if (trimmed.length > 0) {
      return;
    }
    if (previousTrimmed.length === 0) {
      return;
    }

    clearSummaryConversation();
    setShowResults(false);
    setAiSummary("");
    setResults([]);
    setSelectedValue("");
    onApplyWorkspaceFilterRef.current?.(null);
    onSearchRef.current?.("", []);
  }, [clearSummaryConversation, query]);

  const openResult = useCallback(
    (result: WorkspaceSearchResult) => {
      if (onSelectResult) {
        onSelectResult(result);
        return;
      }
      if (result.type === "folder") {
        onOpenFolderById?.(result.id);
        return;
      }
      const fileId = result.fileId ?? result.id;
      onOpenFileById?.(fileId);
    },
    [onOpenFileById, onOpenFolderById, onSelectResult]
  );

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        latestSearchRequestRef.current += 1;
        clearSummaryConversation();
        setIsSearching(false);
        setShowResults(false);
        setAiSummary("");
        setRetrievalError(null);
        setResults([]);
        setSelectedValue("");
        onApplyWorkspaceFilter?.(null);
        onSearch?.("", []);
        return;
      }

      const requestId = latestSearchRequestRef.current + 1;
      latestSearchRequestRef.current = requestId;
      clearSummaryConversation();

      setIsSearching(true);
      setShowResults(true);
      setAiSummary("");
      setRetrievalError(null);

      let vectorResults: WorkspaceSearchResult[];
      try {
        vectorResults = mapWorkspaceRetrievalResults({
          items,
          results: await queryWorkspaceRetrievalApi({
            limit: 8,
            query: trimmed,
            workspaceUuid,
          }),
        });
      } catch (error) {
        if (requestId !== latestSearchRequestRef.current) {
          return;
        }

        setResults([]);
        setSelectedValue("");
        setIsSearching(false);
        setAiSummary("");
        setRetrievalError(resolveWorkspaceRetrievalError(error));
        onApplyWorkspaceFilter?.(null);
        onSearch?.(trimmed, []);
        return;
      }

      if (requestId !== latestSearchRequestRef.current) {
        return;
      }

      const fallbackSummary =
        vectorResults.length > 0
          ? `Found ${vectorResults.length} relevant workspace item${
              vectorResults.length === 1 ? "" : "s"
            } for "${trimmed}".`
          : `No relevant ingested file content found for "${trimmed}".`;

      setResults(vectorResults);
      setSelectedValue(vectorResults[0] ? toResultKey(vectorResults[0]) : "");
      setIsSearching(false);

      onApplyWorkspaceFilter?.(null);
      onSearch?.(trimmed, vectorResults);

      if (vectorResults.length === 0) {
        setAiSummary(fallbackSummary);
        return;
      }

      try {
        const fileIds = Array.from(
          new Set(vectorResults.map((result) => result.fileId ?? result.id))
        );
        const matches = vectorResults.slice(0, 12).map((result) => ({
          fileId: result.fileId ?? result.id,
          snippet: result.snippet,
          sourceType:
            result.sourceType === "file" || result.sourceType === "folder"
              ? undefined
              : result.sourceType,
          title: result.title,
        }));

        await sendSummaryMessage(
          { text: trimmed },
          {
            body: {
              fileIds: fileIds.slice(0, 6),
              matches,
              query: trimmed,
              stream: true,
              workspaceUuid,
            },
          }
        );

        if (requestId !== latestSearchRequestRef.current) {
          return;
        }

        if (!aiSummaryRef.current.trim()) {
          setAiSummary(fallbackSummary);
        }
      } catch {
        if (requestId === latestSearchRequestRef.current) {
          setAiSummary(fallbackSummary);
        }
      }
    },
    [
      clearSummaryConversation,
      items,
      onApplyWorkspaceFilter,
      onSearch,
      sendSummaryMessage,
      workspaceUuid,
    ]
  );

  const runSearch = useCallback(
    (searchQuery: string) => {
      handleSearch(searchQuery).catch(() => undefined);
    },
    [handleSearch]
  );

  const triggerSearch = useCallback(
    (searchQuery: string) => {
      const fastMatch = findFastWorkspaceSearchMatch(searchQuery, items);
      if (fastMatch) {
        openResult(toFastResult(fastMatch));
      }
      runSearch(searchQuery);
    },
    [items, openResult, runSearch]
  );

  return {
    aiSummary,
    containerRef,
    isSearching,
    isSummaryStreaming,
    openResult,
    query,
    retrievalError,
    results,
    selectedValue,
    setQuery,
    setSelectedValue,
    showResults,
    triggerSearch,
    workspaceUuid,
  };
}

export type StylizedSearchBarRuntime = ReturnType<typeof useStylizedSearchBar>;
