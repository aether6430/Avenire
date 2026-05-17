"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@avenire/ui/components/command";
import {
  CaretRight as ChevronRight,
  Sparkle as Sparkles,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import type { CSSProperties } from "react";
import { Markdown } from "@/components/chat/markdown";
import { ChatSpinner } from "@/components/chat/spinner";
import {
  getResultIcon,
  getResultMeta,
  getScoreLabel,
  toResultKey,
} from "@/components/files/stylized-search-bar-model";
import type { StylizedSearchBarRuntime } from "@/components/files/use-stylized-search-bar";

export function StylizedSearchBarSurface({
  filePathById,
  maxWidth,
  placeholder,
  runtime,
}: {
  filePathById?: Map<string, string>;
  maxWidth: string;
  placeholder: string;
  runtime: StylizedSearchBarRuntime;
}) {
  const {
    aiSummary,
    containerRef,
    isSearching,
    isSummaryStreaming,
    openResult,
    query,
    results,
    selectedValue,
    setQuery,
    setSelectedValue,
    showResults,
    triggerSearch,
    workspaceUuid,
  } = runtime;

  return (
    <div className="flex w-full min-w-0 items-center justify-center px-2 py-3">
      <div className={`w-full min-w-0 ${maxWidth}`} ref={containerRef}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            triggerSearch(query);
          }}
        >
          <div className="relative overflow-visible rounded-lg border border-border/70 bg-card">
            {(isSearching || isSummaryStreaming) && (
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px"
                style={{
                  animation: "retrievalShimmer 2.2s linear infinite",
                  backgroundImage:
                    "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--foreground) 16%, transparent) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                }}
              />
            )}

            <Command
              className="rounded-none border-0 bg-transparent p-0 [&_[data-slot=command-input-wrapper]]:p-0 [&_[data-slot=input-group-addon]]:pr-0 [&_[data-slot=input-group]]:h-9 [&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:bg-transparent [&_[data-slot=input-group]]:shadow-none"
              onValueChange={setSelectedValue}
              shouldFilter={false}
              value={selectedValue}
            >
              <div className="border-border/70 border-b px-3 py-3">
                <div className="relative">
                  <CommandInput
                    className="pr-10 text-sm"
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
                {results.length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
                    <span>
                      {`${results.length} match${results.length === 1 ? "" : "es"} in indexed workspace content`}
                    </span>
                    {isSearching || isSummaryStreaming ? (
                      <div className="inline-flex items-center gap-1.5">
                        <ChatSpinner
                          className="px-0 py-0"
                          messages={["Retrieving", "Summarizing"]}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <AnimatePresence initial={false}>
                {showResults ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="pointer-events-auto absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-border/70 bg-card shadow-xl"
                    exit={{ opacity: 0, y: 8 }}
                    initial={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <div className="grid gap-0 border-border/70 md:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                      <section className="border-border/70 border-b px-4 py-3 md:border-r md:border-b-0">
                        <div className="mb-2 flex items-center gap-2 text-muted-foreground text-xs">
                          <Sparkles className="size-3.5" />
                          <span>
                            {isSummaryStreaming
                              ? "Summarizing answer"
                              : "Answer"}
                          </span>
                        </div>
                        <div
                          className="scroll-fade-frame scroll-fade-top scroll-fade-bottom relative"
                          style={
                            {
                              "--scroll-fade-color": "var(--card)",
                            } as CSSProperties
                          }
                        >
                          <div className="max-h-[min(23rem,calc(100vh-22rem))] overflow-y-auto pr-2 [scrollbar-color:color-mix(in_oklab,var(--color-border),transparent_30%)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/70 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
                            {aiSummary ? (
                              <Markdown
                                className="max-w-full break-words text-muted-foreground"
                                content={aiSummary}
                                id={`retrieval-summary-${query}`}
                                textSize="small"
                                workspaceUuid={workspaceUuid}
                              />
                            ) : (
                              <div className="text-muted-foreground">
                                {isSearching ? (
                                  <ChatSpinner
                                    className="-mx-2 -my-1 px-0 py-0"
                                    messages={[
                                      "Searching indexed content",
                                      "Summarizing best matches",
                                    ]}
                                  />
                                ) : (
                                  <p className="text-sm leading-6">
                                    Run a search to generate a concise answer
                                    from the best matching workspace evidence.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </section>

                      <section className="px-2 py-2">
                        <div className="px-1 pb-2 text-muted-foreground text-xs">
                          Matches
                        </div>
                        {results.length === 0 && !isSearching ? (
                          <CommandEmpty className="rounded-md px-3 py-6 text-left text-muted-foreground text-sm">
                            No relevant matches yet. Try a narrower phrase, a
                            file name, or a concept from your notes.
                          </CommandEmpty>
                        ) : null}

                        <div
                          className="scroll-fade-frame scroll-fade-top scroll-fade-bottom relative"
                          style={
                            {
                              "--scroll-fade-color": "var(--card)",
                            } as CSSProperties
                          }
                        >
                          <CommandList className="max-h-[min(23rem,calc(100vh-22rem))] overflow-x-hidden pr-1 [scrollbar-color:color-mix(in_oklab,var(--color-border),transparent_30%)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/70 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
                            {results.map((result, index) => {
                              const value = toResultKey(result);
                              const fileId = result.fileId ?? result.id;
                              const Icon = getResultIcon(result);
                              const isSelected = selectedValue === value;
                              const meta = getResultMeta(result);

                              return (
                                <CommandItem
                                  className="items-start gap-2.5 rounded-md border border-transparent px-2.5 py-2 data-selected:border-border/80 data-selected:bg-muted/55"
                                  key={value}
                                  onSelect={() => openResult(result)}
                                  style={{
                                    animation:
                                      "retrievalResultIn 340ms cubic-bezier(0.22,1,0.36,1) both",
                                    animationDelay: `${index * 45}ms`,
                                  }}
                                  title={
                                    filePathById?.get(fileId) ??
                                    result.path ??
                                    result.title
                                  }
                                  value={value}
                                >
                                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background">
                                    <Icon className="size-3.5 text-muted-foreground" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="truncate font-medium text-xs">
                                          {result.title}
                                        </p>
                                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                          {filePathById?.get(fileId) ??
                                            result.path ??
                                            result.description}
                                        </p>
                                      </div>
                                      <span className="shrink-0 text-[10px] text-muted-foreground">
                                        {getScoreLabel(result.score)}
                                      </span>
                                    </div>
                                    {meta ? (
                                      <p className="mt-1.5 text-[10px] text-muted-foreground">
                                        {meta}
                                      </p>
                                    ) : null}
                                    <p className="mt-1.5 line-clamp-2 whitespace-normal break-words text-[11px] text-muted-foreground leading-5">
                                      {result.snippet}
                                    </p>
                                  </div>
                                  <ChevronRight
                                    className={
                                      isSelected
                                        ? "mt-0.5 size-3 shrink-0 translate-x-0.5 text-muted-foreground transition-transform duration-150"
                                        : "mt-0.5 size-3 shrink-0 translate-x-0 text-muted-foreground transition-transform duration-150"
                                    }
                                  />
                                </CommandItem>
                              );
                            })}
                          </CommandList>
                        </div>
                      </section>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </Command>
          </div>
        </form>

        <style>{`
          @keyframes retrievalShimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }

          @keyframes retrievalResultIn {
            0% {
              opacity: 0;
              transform: translateY(10px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
