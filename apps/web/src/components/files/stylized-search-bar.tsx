"use client";

import { Button } from "@avenire/ui/components/button";
import { Command, CommandInput } from "@avenire/ui/components/command";
import { Spinner, X } from "@phosphor-icons/react";
import { memo } from "react";
import type {
  WorkspaceSearchItem,
  WorkspaceSearchResult,
} from "@/components/files/search-model";
import { useStylizedSearchBar } from "@/components/files/use-stylized-search-bar";

export interface StylizedSearchBarProps {
  focusSignal?: number;
  initialQuery?: string;
  initialResults?: WorkspaceSearchResult[];
  items: WorkspaceSearchItem[];
  maxWidth?: string;
  onApplyWorkspaceFilter?: (itemIds: string[] | null) => void;
  onSearch?: (query: string, results: WorkspaceSearchResult[]) => void;
  placeholder?: string;
  workspaceUuid: string;
}

const StylizedSearchBar = memo(function StylizedSearchBar({
  focusSignal,
  initialQuery = "",
  initialResults = [],
  items,
  maxWidth = "max-w-5xl",
  onApplyWorkspaceFilter,
  onSearch,
  placeholder = "Search anything...",
  workspaceUuid,
}: StylizedSearchBarProps) {
  const runtime = useStylizedSearchBar({
    focusSignal,
    initialQuery,
    initialResults,
    items,
    onApplyWorkspaceFilter,
    onSearch,
    workspaceUuid,
  });
  const matchingFileCount = new Set(
    runtime.results.map((result) => result.fileId ?? result.id)
  ).size;

  return (
    <div className="flex w-full min-w-0 items-center justify-center px-2 py-3">
      <div className={`w-full min-w-0 ${maxWidth}`} ref={runtime.containerRef}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            runtime.triggerSearch(runtime.query);
          }}
        >
          <div className="relative overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-sm">
            <Command
              className="rounded-none border-0 bg-transparent p-0 [&_[data-slot=command-input-wrapper]]:px-3 [&_[data-slot=input-group-addon]]:pr-0 [&_[data-slot=input-group]]:h-9 [&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:bg-transparent [&_[data-slot=input-group]]:shadow-none"
              shouldFilter={false}
            >
              <div className="px-3 py-3">
                <div className="relative">
                  <CommandInput
                    className="pr-16 font-medium text-[15px] tracking-[-0.01em]"
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        runtime.setQuery("");
                        return;
                      }
                      if (event.key !== "Enter") {
                        return;
                      }
                      event.preventDefault();
                      runtime.triggerSearch(runtime.query);
                    }}
                    onValueChange={runtime.setQuery}
                    placeholder={placeholder}
                    value={runtime.query}
                  />
                  <div className="absolute top-1/2 right-2 z-20 flex -translate-y-1/2 items-center gap-1">
                    {runtime.isSearching ? (
                      <Spinner className="size-3.5 text-muted-foreground" />
                    ) : null}
                    {runtime.query.trim().length > 0 ? (
                      <Button
                        className="h-6 w-6 rounded-md p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => runtime.setQuery("")}
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                      >
                        <X className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                {runtime.query.trim().length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
                    {runtime.retrievalError ? (
                      <span>{runtime.retrievalError}</span>
                    ) : (
                      <span>
                        {runtime.isSearching
                          ? "Searching indexed workspace content"
                          : `${matchingFileCount} matching file${matchingFileCount === 1 ? "" : "s"}`}
                      </span>
                    )}
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
export type { WorkspaceSearchItem, WorkspaceSearchResult };
