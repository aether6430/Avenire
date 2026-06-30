"use client";

import { Button } from "@avenire/ui/components/button";
import { Command, CommandInput } from "@avenire/ui/components/command";
import { Spinner } from "@avenire/ui/components/spinner";
import { X } from "@phosphor-icons/react";
import { memo, useEffect, useRef, useState } from "react";

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
): Promise<WorkspaceSearchResult[]> {
  const query = searchQuery.trim();
  if (!query) {
    return [];
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
    return [];
  }

  const payload = (await response.json()) as {
    results?: Array<{
      chunkId?: string;
      content: string;
      endMs?: number | null;
      fileId?: string | null;
      page?: number | null;
      rerankScore?: number;
      score?: number;
      sourceType?: "pdf" | "image" | "video" | "audio" | "document" | "markdown" | "link";
      startMs?: number | null;
    }>;
  };

  const filesById = new Map(
    items.filter((item) => item.type === "file").map((item) => [item.id, item])
  );

  const mapped: WorkspaceSearchResult[] = [];
  for (const result of payload.results ?? []) {
    const fileId = result.fileId ?? null;
    if (!fileId) {
      continue;
    }
    const item = filesById.get(fileId);
    if (!item) {
      continue;
    }

    const snippet = sanitizeSnippet(result.content || item.snippet);
    if (!snippet) {
      continue;
    }

    mapped.push({
      chunkId: result.chunkId,
      description: item.description,
      endMs: result.endMs ?? null,
      fileId,
      highlightText: (result.content || "").trim(),
      id: item.id,
      page: result.page ?? null,
      score: result.rerankScore ?? result.score ?? 0,
      snippet,
      sourceType: result.sourceType,
      startMs: result.startMs ?? null,
      title: item.title,
      type: "file",
    });
  }

  return mapped.sort(
    (a, b) => b.score - a.score || a.title.localeCompare(b.title)
  );
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
    setIsSearching(false);
    onApplyWorkspaceFilterRef.current?.(null);
    onSearchRef.current?.("", []);
  }, [query]);

  const handleSearch = async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      latestSearchRequestRef.current += 1;
      setResults([]);
      setIsSearching(false);
      onApplyWorkspaceFilter?.(null);
      onSearch?.("", []);
      return;
    }

    const requestId = latestSearchRequestRef.current + 1;
    latestSearchRequestRef.current = requestId;
    setIsSearching(true);

    const vectorResults = await runWorkspaceVectorSearchApi(
      trimmed,
      workspaceUuid,
      items
    );

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
                        : `${matchingFileCount} matching file${matchingFileCount === 1 ? "" : "s"}`}
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
