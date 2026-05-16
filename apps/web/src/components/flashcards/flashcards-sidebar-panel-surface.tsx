"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import {
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avenire/ui/components/empty";
import { Input } from "@avenire/ui/components/input";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@avenire/ui/components/sidebar";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { BookOpenText as BookOpenCheck } from "@phosphor-icons/react/BookOpenText";
import { Empty } from "@phosphor-icons/react/Empty";
import { useEffect, useRef } from "react";
import type { FlashcardsSidebarPanelRuntime } from "@/components/flashcards/use-flashcards-sidebar-panel";
import { FlashcardsSidebarPanelCreateDialog } from "./flashcards-sidebar-panel-create-dialog";
import { getFlashcardsSidebarSetsState } from "./flashcards-sidebar-panel-model";

function SparklineChip({ due, newCount }: { due: number; newCount: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Badge variant="outline">{due}</Badge>
      <Badge variant="secondary">{newCount}</Badge>
    </span>
  );
}

export function FlashcardsSidebarPanelSurface({
  runtime,
}: {
  runtime: FlashcardsSidebarPanelRuntime;
}) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const reviewHref = runtime.getReviewHref();
  const setsState = getFlashcardsSidebarSetsState({
    filteredSetCount: runtime.filteredSets.length,
    loadFailed: runtime.setsLoadFailed,
    loading: runtime.setsLoading,
    totalSetCount: runtime.sets.length,
  });

  useEffect(() => {
    if (runtime.isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [runtime.isSearchOpen]);

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <SidebarGroup>
        <div className="flex items-center justify-between gap-2">
          <SidebarGroupLabel>Review</SidebarGroupLabel>
          <div className="flex items-center gap-1">
            <Button
              aria-label="Search Mindset Sets"
              className="h-7 w-7 rounded-md border border-border/60 bg-background/60 p-0 text-muted-foreground shadow-none hover:bg-muted"
              onClick={runtime.toggleSearch}
              size="icon"
              type="button"
              variant="ghost"
            >
              <MagnifyingGlass className="size-3.5" />
            </Button>
            <FlashcardsSidebarPanelCreateDialog runtime={runtime} />
          </div>
        </div>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                draggable
                onClick={(event) => runtime.handleEntryClick(event, reviewHref)}
                onContextMenu={(event) =>
                  runtime.handleEntryContextMenu(event, reviewHref)
                }
                onDragStart={(event) =>
                  runtime.handleEntryDragStart(event, reviewHref)
                }
                onFocus={() => {
                  if (runtime.reviewTarget) {
                    runtime.prefetchSet(runtime.reviewTarget.id);
                  }
                }}
                onMouseEnter={() => {
                  if (runtime.reviewTarget) {
                    runtime.prefetchSet(runtime.reviewTarget.id);
                  }
                }}
              >
                <BookOpenCheck className="size-4" />
                <span>Review Due</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="min-h-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <SidebarGroupLabel>Mindset Sets</SidebarGroupLabel>
          <Button
            aria-label="Search Mindset Sets"
            className="h-7 w-7 rounded-md border border-border/60 bg-background/60 p-0 text-muted-foreground shadow-none hover:bg-muted"
            onClick={runtime.toggleSearch}
            size="icon"
            type="button"
            variant="ghost"
          >
            <MagnifyingGlass className="size-3.5" />
          </Button>
        </div>
        <SidebarGroupContent>
          {runtime.isSearchOpen || runtime.searchQuery ? (
            <Input
              className="mt-2 h-8"
              onChange={(event) => runtime.setSearchQuery(event.target.value)}
              placeholder="Search Mindset Sets..."
              ref={searchInputRef}
              value={runtime.searchQuery}
            />
          ) : null}
          {setsState ? (
            <Empty className="min-h-[8.5rem] rounded-2xl border-border/50 bg-background/60 px-3 py-4">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookOpenCheck className="size-4" />
                </EmptyMedia>
                <EmptyTitle className="text-xs">{setsState.title}</EmptyTitle>
              </EmptyHeader>
              <EmptyContent className="max-w-none">
                <EmptyDescription className="text-[11px] leading-relaxed">
                  {setsState.description}
                </EmptyDescription>
              </EmptyContent>
            </Empty>
          ) : (
            <SidebarMenu>
              {runtime.filteredSets.map((set) => {
                const href = runtime.getSetHref(set.id);
                return (
                  <SidebarMenuItem key={set.id}>
                    <SidebarMenuButton
                      draggable
                      isActive={runtime.activeSetId === set.id}
                      onClick={(event) => runtime.handleEntryClick(event, href)}
                      onContextMenu={(event) =>
                        runtime.handleEntryContextMenu(event, href)
                      }
                      onDragStart={(event) =>
                        runtime.handleEntryDragStart(event, href)
                      }
                      onFocus={() => {
                        runtime.prefetchSet(set.id);
                      }}
                      onMouseEnter={() => {
                        runtime.prefetchSet(set.id);
                      }}
                    >
                      <SparklineChip
                        due={set.dueCount}
                        newCount={set.newCount}
                      />
                      <span className="truncate">{set.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          )}
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
}
