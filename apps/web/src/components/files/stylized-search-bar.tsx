"use client";

import { Button } from "@avenire/ui/components/button";
import { Command, CommandInput } from "@avenire/ui/components/command";
import { Spinner } from "@avenire/ui/components/spinner";
import { X } from "@phosphor-icons/react";
import { memo, useEffect, useRef, useState } from "react";
import { retrievalQueryResponseSchema } from "@/lib/retrieval-http-contract";

export interface WorkspaceSearchItem {
  description: string;
  id: string;
  snippet: string;
  title: string;
  type: "file" | "folder";
}

export interface WorkspaceSearchResult {
  chunkId?: string;
  description: string;
  endMs?: number | null;
  fileId?: string | null;
  highlightText?: string;
  id: string;
  page?: number | null;
  score: number;
  snippet: string;
  sourceType?:
    | "file"
    | "folder"
    | "pdf"
    | "video"
    | "audio"
    | "document"
    | "image"
    | "markdown"
    | "link";
  startMs?: number | null;
  title: string;
  type: "file" | "folder";
}

interface StylizedSearchBarProps {
  filePathById?: Map<string, string>;
  focusSignal?: number;
  initialQuery?: string;
  initialResults?: WorkspaceSearchResult[];
  items: WorkspaceSearchItem[];
  maxWidth?: string;
  onApplyWorkspaceFilter?: (itemIds: string[] | null) => void;
  onOpenFileById?: (fileId: string) => void;
  onOpenFolderById?: (folderId: string) => void;
  onSearch?: (query: string, results: WorkspaceSearchResult[]) => void;
  onSelectResult?: (result: WorkspaceSearchResult) => void;
  placeholder?: string;
  selectedResultChunkId?: string | null;
  workspaceUuid: string;
}

interface WorkspaceSearchApiResponse {
  error: string | null;
  results: WorkspaceSearchResult[];
}

const sanitizeSnippet = (value: string): string => {
  const cleaned = value
    .replace(/\[https?:\/\/[^\]\s]+,\s*p\.?\s*\d+\]\s*/gi, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[^\x20-\x7E\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  return cleaned.length > 420 ? `${cleaned.slice(0, 420)}...` : cleaned;
};

async function runWorkspaceVectorSearchApi(
  searchQuery: string,
  workspaceUuid: string,
  items: WorkspaceSearchItem[]
): Promise<WorkspaceSearchApiResponse> {
  const query = searchQuery.trim();
  if (!query) {
    return { error: null, results: [] };
  }

  const response = await fetch("/api/ai/retrieval/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspaceUuid,
      query,
      limit: 24,
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    return {
      error: body?.error ?? "Search is temporarily unavailable. Try again.",
      results: [],
    };
  }

  const payload = retrievalQueryResponseSchema.safeParse(
    await response.json().catch(() => null)
  );
  if (!payload.success) {
    return {
      error: "Search returned an invalid response. Try again.",
      results: [],
    };
  }

  const filesById = new Map(
    items.flatMap((item) => (item.type === "file" ? [[item.id, item]] : []))
  );

  const mapped: WorkspaceSearchResult[] = [];
  for (const result of payload.data.results) {
    const fileId = result.fileId ?? null;
    if (!fileId) {
      continue;
    }
    const item = filesById.get(fileId);
    const snippet = sanitizeSnippet(result.content || item?.snippet || "");
    if (!snippet) {
      continue;
    }

    mapped.push({
      chunkId: result.chunkId,
      description: item?.description ?? result.sourceType ?? "Indexed file",
      endMs: result.endMs ?? null,
      fileId,
      highlightText: (result.content || "").trim(),
      id: item?.id ?? fileId,
      page: result.page ?? null,
      score: result.rerankScore ?? result.score ?? 0,
      snippet,
      sourceType: result.sourceType,
      startMs: result.startMs ?? null,
      title: item?.title ?? result.title?.trim() ?? "Indexed file",
      type: "file",
    });
  }

  return {
    error: null,
    results: mapped.toSorted(
      (a, b) => b.score - a.score || a.title.localeCompare(b.title)
    ),
  };
}

const StylizedSearchBar = memo(function StylizedSearchBar({
  items,
  workspaceUuid,
  initialQuery = "",
  initialResults = [],
  onSearch,
  onApplyWorkspaceFilter,
  focusSignal,
  placeholder = "Search anything...",
  maxWidth = "max-w-5xl",
}: StylizedSearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] =
    useState<WorkspaceSearchResult[]>(initialResults);
  const containerRef = useRef<HTMLDivElement>(null);
  const latestSearchRequestRef = useRef(0);
  const previousQueryRef = useRef(initialQuery);
  const onSearchRef = useRef(onSearch);
  const onApplyWorkspaceFilterRef = useRef(onApplyWorkspaceFilter);
  const matchingFileCount = new Set(
    results.map((result) => result.fileId ?? result.id)
  ).size;

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
    setSearchError(null);
    setIsSearching(false);
    onApplyWorkspaceFilterRef.current?.(null);
    onSearchRef.current?.("", []);
  }, [query]);

  const handleSearch = async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      latestSearchRequestRef.current += 1;
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      onApplyWorkspaceFilter?.(null);
      onSearch?.("", []);
      return;
    }

    const requestId = latestSearchRequestRef.current + 1;
    latestSearchRequestRef.current = requestId;
    setIsSearching(true);

    const searchResponse = await runWorkspaceVectorSearchApi(
      trimmed,
      workspaceUuid,
      items
    );

    if (requestId !== latestSearchRequestRef.current) {
      return;
    }

    const itemIds = Array.from(
      new Set(
        searchResponse.results.map((result) => result.fileId ?? result.id)
      )
    );

    setResults(searchResponse.results);
    setSearchError(searchResponse.error);
    setIsSearching(false);
    onApplyWorkspaceFilter?.(itemIds);
    onSearch?.(trimmed, searchResponse.results);
  };

  return (
    <div className="flex w-full min-w-0 items-center justify-center px-2 py-3">
      <div className={`w-full min-w-0 ${maxWidth}`} ref={containerRef}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSearch(query).catch(() => undefined);
          }}
        >
          <div className="relative overflow-hidden rounded-md border border-border/70 bg-card">
            <Command
              className="rounded-none border-0 bg-transparent p-0 [&_[data-slot=command-input-wrapper]]:p-0 [&_[data-slot=input-group-addon]]:pr-0 [&_[data-slot=input-group]]:h-9 [&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:bg-transparent [&_[data-slot=input-group]]:shadow-none"
              shouldFilter={false}
            >
              <div className="px-3 py-3">
                <div className="relative">
                  <CommandInput
                    className="pr-16 text-sm"
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setQuery("");
                        return;
                      }
                      if (event.key !== "Enter") {
                        return;
                      }
                      event.preventDefault();
                      handleSearch(query).catch(() => undefined);
                    }}
                    onValueChange={setQuery}
                    placeholder={placeholder}
                    value={query}
                  />
                  <div className="absolute top-1/2 right-2 z-20 flex -translate-y-1/2 items-center gap-1">
                    {isSearching ? (
                      <Spinner className="size-3.5 text-muted-foreground" />
                    ) : null}
                    {query.trim().length > 0 ? (
                      <Button
                        className="h-6 w-6 rounded-md p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => setQuery("")}
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                      >
                        <X className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                {query.trim().length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
                    <span>
                      {isSearching
                        ? "Searching indexed workspace content"
                        : (searchError ??
                          `${matchingFileCount} matching file${matchingFileCount === 1 ? "" : "s"}`)}
                    </span>
                  </div>
                ) : null}
              </div>
            </Command>
          </div>
        </form>
      </div>
    </div>
  );
});

export { StylizedSearchBar };
export default StylizedSearchBar;
