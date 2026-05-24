"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { Input } from "@avenire/ui/components/input";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@avenire/ui/components/sidebar";
import { Spinner } from "@avenire/ui/components/spinner";
import { MagnifyingGlass, Sparkle as Sparkles } from "@phosphor-icons/react";
import { BookOpenText as BookOpenCheck } from "@phosphor-icons/react/BookOpenText";
import type { Route } from "next";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import type { DashboardSidebarRuntime } from "@/components/dashboard/use-dashboard-sidebar";
import { FlashcardsSidebarPanelCreateDialog } from "@/components/flashcards/flashcards-sidebar-panel-create-dialog";
import { getFlashcardsSidebarSetsState } from "@/components/flashcards/flashcards-sidebar-panel-model";
import type { FlashcardsSidebarPanelRuntime } from "@/components/flashcards/use-flashcards-sidebar-panel";
import { useFlashcardsSidebarPanel } from "@/components/flashcards/use-flashcards-sidebar-panel";
import { DashboardSidebarChatPanel } from "./dashboard-sidebar-chat-panel";
import { SidebarEmptyState } from "./dashboard-sidebar-shared";

const DeferredFilesSidebarPanel = dynamic(
  () =>
    import("@/components/dashboard/sidebar-files-panel").then((module) => ({
      default: module.FilesSidebarPanel,
    })),
  {
    loading: () => (
      <div className="absolute inset-0 flex items-start p-4">
        <div className="inline-flex items-center gap-2 text-muted-foreground text-xs">
          <Spinner className="size-3.5" />
          Loading files...
        </div>
      </div>
    ),
  }
);

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
    errorMessage: runtime.setsErrorMessage,
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
    <div className="no-scrollbar absolute inset-0 overflow-y-auto">
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
            <div className="rounded-xl border border-border/50 bg-background/60 px-4 py-4 text-center">
              <p className="font-medium text-foreground text-xs">
                {setsState.title}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                {setsState.description}
              </p>
            </div>
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

const DeferredSidebarTaskPreview = dynamic(
  () =>
    import("@/components/dashboard/sidebar-task-preview").then((module) => ({
      default: module.SidebarTaskPreview,
    })),
  {
    loading: () => (
      <div className="absolute inset-0 overflow-y-auto px-4 py-4 text-muted-foreground text-xs">
        Loading tasks...
      </div>
    ),
  }
);

export function DashboardSidebarMountedViews({
  runtime,
}: {
  runtime: DashboardSidebarRuntime;
}) {
  const {
    activeChatSlug,
    activeWorkspace,
    chatActionStatus,
    chatsLoadFailed,
    chatsLoading,
    chatSearchQuery,
    closeMobileSidebar,
    currentFileId,
    currentFlashcardSetId,
    currentFolderId,
    deleteChat,
    editingChatSlug,
    editingTitle,
    filteredOtherChats,
    filteredPinnedChats,
    mountedViews,
    navigate,
    navigateToFilesRoot,
    pendingChatSlug,
    setChatSearchQuery,
    setEditingChatSlug,
    setEditingTitle,
    sidebarView,
    triggerHaptic,
    updateChat,
    workspaceUuid,
  } = runtime;
  const flashcardsSidebarRuntime = useFlashcardsSidebarPanel({
    active: sidebarView === "flashcards",
    activeSetId: currentFlashcardSetId ?? undefined,
    workspaceUuid: workspaceUuid ?? undefined,
  });

  if (sidebarView === "tasks") {
    return (
      <DeferredSidebarTaskPreview
        activeWorkspaceId={activeWorkspace?.workspaceId}
        closeMobileSidebar={closeMobileSidebar}
        navigate={navigate}
      />
    );
  }

  if (!sidebarView) {
    return (
      <div className="absolute inset-0 flex items-start p-4">
        <SidebarEmptyState
          description="Pick a workspace surface above to load its actions, shortcuts, and context."
          icon={Sparkles}
          title="Choose a surface"
        />
      </div>
    );
  }

  return (
    <>
      <div
        aria-hidden={sidebarView !== "chat"}
        className={
          mountedViews.has("chat")
            ? `absolute inset-0 overflow-y-auto transition-opacity duration-150 ${
                sidebarView === "chat"
                  ? "opacity-100"
                  : "pointer-events-none opacity-0"
              }`
            : "hidden"
        }
      >
        {mountedViews.has("chat") ? (
          <DashboardSidebarChatPanel
            activeChatSlug={activeChatSlug}
            chatActionStatus={chatActionStatus}
            chatSearchQuery={chatSearchQuery}
            chatsLoadFailed={chatsLoadFailed}
            chatsLoading={chatsLoading}
            editingChatSlug={editingChatSlug}
            editingTitle={editingTitle}
            isSearchOpen={runtime.isChatSearchOpen}
            onCancelRename={() => {
              setEditingChatSlug(null);
              setEditingTitle("");
            }}
            onCreateChat={() => {
              void triggerHaptic("selection");
              setEditingChatSlug(null);
              setEditingTitle("");
              void runtime.createChat();
            }}
            onDelete={(chatSlug) => {
              setEditingChatSlug(null);
              setEditingTitle("");
              void deleteChat(chatSlug);
            }}
            onEditingTitleChange={setEditingTitle}
            onFinishRename={(chatSlug) => {
              void updateChat(chatSlug, { title: editingTitle });
              setEditingChatSlug(null);
              setEditingTitle("");
            }}
            onSelect={(chatSlug) => {
              setEditingChatSlug(null);
              setEditingTitle("");
              navigate(`/workspace/chats/${chatSlug}` as Route);
            }}
            onSelectInNewPane={(chatSlug) => {
              setEditingChatSlug(null);
              setEditingTitle("");
              navigate(`/workspace/chats/${chatSlug}` as Route, {
                openInNewPane: true,
              });
            }}
            onStartRename={(chat) => {
              setEditingChatSlug(chat.slug);
              setEditingTitle(chat.title);
            }}
            onTogglePin={(chatSlug, pinned) => {
              void updateChat(chatSlug, { pinned });
            }}
            onToggleSearch={runtime.toggleChatSearch}
            onUpdateChatSearchQuery={setChatSearchQuery}
            otherChats={filteredOtherChats}
            pendingChatSlug={pendingChatSlug}
            pinnedChats={filteredPinnedChats}
          />
        ) : null}
      </div>
      <div
        aria-hidden={sidebarView !== "files"}
        className={
          mountedViews.has("files")
            ? `absolute inset-0 transition-opacity duration-150 ${
                sidebarView === "files"
                  ? "opacity-100"
                  : "pointer-events-none opacity-0"
              }`
            : "hidden"
        }
      >
        {sidebarView === "files" ? (
          <DeferredFilesSidebarPanel
            currentFileId={currentFileId}
            currentFolderId={currentFolderId}
            emitGlobalFileIntent={runtime.emitFileIntent}
            key={`${workspaceUuid ?? "no-workspace"}:${currentFolderId ?? "root"}:${currentFileId ?? "no-file"}`}
            navigateToFilesRoot={navigateToFilesRoot}
            workspaceUuid={workspaceUuid}
          />
        ) : null}
      </div>
      <div
        aria-hidden={sidebarView !== "flashcards"}
        className={
          mountedViews.has("flashcards")
            ? `absolute inset-0 transition-opacity duration-150 ${
                sidebarView === "flashcards"
                  ? "opacity-100"
                  : "pointer-events-none opacity-0"
              }`
            : "hidden"
        }
      >
        {mountedViews.has("flashcards") ? (
          <FlashcardsSidebarPanelSurface runtime={flashcardsSidebarRuntime} />
        ) : null}
      </div>
    </>
  );
}
