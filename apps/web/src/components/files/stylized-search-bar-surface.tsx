"use client";

import { Button } from "@avenire/ui/components/button";
import { Command, CommandInput } from "@avenire/ui/components/command";
import { Spinner, X } from "@phosphor-icons/react";
import type { StylizedSearchBarRuntime } from "@/components/files/use-stylized-search-bar";

export function StylizedSearchBarSurface({
  maxWidth,
  placeholder,
  runtime,
}: {
  maxWidth: string;
  placeholder: string;
  runtime: StylizedSearchBarRuntime;
}) {
  const {
    containerRef,
    isSearching,
    query,
    retrievalError,
    results,
    setQuery,
    triggerSearch,
  } = runtime;
  const matchingFileCount = new Set(
    results.map((result) => result.fileId ?? result.id)
  ).size;

  return (
    <div className="flex w-full min-w-0 items-center justify-center px-2 py-3">
      <div className={`w-full min-w-0 ${maxWidth}`} ref={containerRef}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            triggerSearch(query);
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
                      triggerSearch(query);
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
                    {retrievalError ? (
                      <span>{retrievalError}</span>
                    ) : (
                      <span>
                        {isSearching
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
}
