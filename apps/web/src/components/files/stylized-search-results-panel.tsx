"use client";

import {
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@avenire/ui/components/command";
import { cn } from "@avenire/ui/lib/utils";
import { Sparkle as Sparkles } from "@phosphor-icons/react";
import { CaretRight as ChevronRight } from "@phosphor-icons/react/CaretRight";
import { AnimatePresence, motion } from "motion/react";
import type { CSSProperties } from "react";
import { Markdown } from "@/components/chat/markdown";
import type { WorkspaceSearchResult } from "@/components/files/search-model";
import { ChatSpinner } from "../chat/spinner";
import {
  getResultIcon,
  getResultMeta,
  getScoreLabel,
  toResultKey,
} from "./stylized-search-bar-model";

interface StylizedSearchResultsPanelProps {
  aiSummary: string;
  isSearching: boolean;
  isSummaryStreaming: boolean;
  onOpenResult: (result: WorkspaceSearchResult) => void;
  query: string;
  results: WorkspaceSearchResult[];
  retrievalError: string | null;
  selectedValue: string;
  showResults: boolean;
  workspaceUuid: string;
}

export function StylizedSearchResultsPanel({
  aiSummary,
  isSearching,
  isSummaryStreaming,
  onOpenResult,
  query,
  retrievalError,
  results,
  selectedValue,
  showResults,
  workspaceUuid,
}: StylizedSearchResultsPanelProps) {
  return (
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
                  {isSummaryStreaming ? "Summarizing answer" : "Answer"}
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
                          Run a search to generate a concise answer from the
                          best matching workspace evidence.
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
              {results.length === 0 && !isSearching && retrievalError ? (
                <CommandEmpty className="rounded-md px-3 py-6 text-left text-muted-foreground text-sm">
                  {retrievalError}
                </CommandEmpty>
              ) : results.length === 0 && !isSearching ? (
                <CommandEmpty className="rounded-md px-3 py-6 text-left text-muted-foreground text-sm">
                  No relevant matches yet. Try a narrower phrase, a file name,
                  or a concept from your notes.
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
                    const Icon = getResultIcon(result);
                    const isSelected = selectedValue === value;
                    const meta = getResultMeta(result);

                    return (
                      <CommandItem
                        className="items-start gap-2.5 rounded-md border border-transparent px-2.5 py-2 data-selected:border-border/80 data-selected:bg-muted/55"
                        key={value}
                        onSelect={() => onOpenResult(result)}
                        style={{
                          animation:
                            "retrievalResultIn 340ms cubic-bezier(0.22,1,0.36,1) both",
                          animationDelay: `${index * 45}ms`,
                        }}
                        title={result.path ?? result.title}
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
                                {result.path ?? result.description}
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
                          className={cn(
                            "mt-0.5 size-3 shrink-0 text-muted-foreground transition-transform duration-150",
                            isSelected ? "translate-x-0.5" : "translate-x-0"
                          )}
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
  );
}
