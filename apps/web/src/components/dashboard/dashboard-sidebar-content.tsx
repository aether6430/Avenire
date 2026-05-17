"use client";

import { Button } from "@avenire/ui/components/button";
import { ExpandableTabs } from "@avenire/ui/components/expandable-tabs";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@avenire/ui/components/sidebar";
import { Spinner } from "@avenire/ui/components/spinner";
import { TooltipProvider } from "@avenire/ui/components/tooltip";
import { cn } from "@avenire/ui/lib/utils";
import {
  ListChecks,
  Chat as MessageSquare,
  SidebarSimple,
  Sparkle as Sparkles,
} from "@phosphor-icons/react";
import { Files } from "@phosphor-icons/react/Files";
import type { Route } from "next";
import dynamic from "next/dynamic";
import type { DashboardSidebarRuntime } from "@/components/dashboard/use-dashboard-sidebar";
import { DashboardSidebarChatPanel } from "./dashboard-sidebar-chat-panel";
import { SectionButton, SidebarEmptyState } from "./dashboard-sidebar-shared";

const FlashcardsSidebarPanel = dynamic(
  () =>
    import("@/components/flashcards/sidebar-panel").then((module) => ({
      default: module.FlashcardsSidebarPanel,
    })),
  {
    loading: () => (
      <div className="absolute inset-0 flex items-start p-4">
        <div className="inline-flex items-center gap-2 text-muted-foreground text-xs">
          <Spinner className="size-3.5" />
          Loading mindset sets...
        </div>
      </div>
    ),
  }
);

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

export function DashboardSidebarContent({
  runtime,
}: {
  runtime: DashboardSidebarRuntime;
}) {
  const {
    activeChatSlug,
    activeTabValue,
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
    isMobile,
    isPeekabooActive,
    mobileSidebarView,
    mountedViews,
    navigate,
    navigateToFilesRoot,
    openPeekSidebar,
    closePeekSidebar,
    pendingChatSlug,
    primaryFilesRoute,
    setChatSearchQuery,
    setDesktopSidebarView,
    setEditingChatSlug,
    setEditingTitle,
    setMobileSidebarView,
    sidebarView,
    state,
    toggleSidebar,
    triggerHaptic,
    updateChat,
    warmWorkspaceSection,
    workspaceUuid,
  } = runtime;

  return (
    <SidebarContent>
      <TooltipProvider delay={280}>
        <SidebarGroup className="px-2 pb-1">
          <div className="flex h-8 items-center gap-2 px-2">
            <SidebarGroupLabel className="h-auto flex-1 px-0">
              Workspace
            </SidebarGroupLabel>
            <Button
              aria-label={
                state === "expanded" ? "Collapse sidebar" : "Expand sidebar"
              }
              className="size-7 shrink-0 rounded-md"
              onClick={() => {
                toggleSidebar();
              }}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <SidebarSimple
                className={cn(
                  "size-4 transition-transform duration-300",
                  state === "expanded" ? "rotate-180" : "rotate-0"
                )}
              />
            </Button>
          </div>
          <ExpandableTabs
            allowDeselect={false}
            className="mt-1"
            items={[
              { value: "chat", label: "Methods", icon: MessageSquare },
              { value: "flashcards", label: "Mindset Sets", icon: Sparkles },
              { value: "tasks", label: "Tasks", icon: ListChecks },
              { value: "files", label: "Files", icon: Files },
            ]}
            onItemClick={(item) => {
              const nextView = item.value as
                | "chat"
                | "flashcards"
                | "files"
                | "tasks";

              if (isMobile) {
                setMobileSidebarView(nextView);
              } else {
                setDesktopSidebarView(nextView);
              }
            }}
            onItemContextMenu={(item) => {
              if (isMobile) {
                return;
              }

              const nextView = item.value as
                | "chat"
                | "flashcards"
                | "files"
                | "tasks";
              if (isMobile) {
                setMobileSidebarView(nextView);
              } else {
                setDesktopSidebarView(nextView);
              }
            }}
            onItemHover={(item) => {
              warmWorkspaceSection(
                item.value as "chat" | "flashcards" | "files" | "tasks"
              );
            }}
            onValueChange={(nextValue) => {
              if (!nextValue) {
                return;
              }
              const nextView = nextValue as
                | "chat"
                | "flashcards"
                | "files"
                | "tasks";
              if (isMobile) {
                setMobileSidebarView(nextView);
              } else {
                setDesktopSidebarView(nextView);
              }
            }}
            persistenceKey="dashboard-workspace-tabs"
            value={activeTabValue}
          />
        </SidebarGroup>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {sidebarView === "workspace" ? (
            <div className="absolute inset-0 overflow-y-auto px-2 py-2">
              <SidebarGroup>
                <SidebarGroupLabel>Workspace Home</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SectionButton
                      dragHref={"/workspace/chats/new" as Route}
                      icon={MessageSquare}
                      label="New Method"
                      onClick={(event) => {
                        closeMobileSidebar();
                        navigate("/workspace/chats/new" as Route, {
                          openInNewPane: !isMobile && event.altKey,
                        });
                      }}
                      onContextMenu={(event) => {
                        if (isMobile) {
                          return;
                        }
                        event.preventDefault();
                        navigate("/workspace/chats/new" as Route, {
                          openInNewPane: true,
                        });
                      }}
                    />
                    <SectionButton
                      dragHref={"/workspace/flashcards" as Route}
                      icon={Sparkles}
                      label="Open Mindset Sets"
                      onClick={(event) => {
                        closeMobileSidebar();
                        if (!isMobile) {
                          setDesktopSidebarView("flashcards");
                          navigate("/workspace/flashcards" as Route, {
                            openInNewPane: event.altKey,
                          });
                          return;
                        }
                        navigate("/workspace/flashcards" as Route, {
                          openInNewPane: false,
                        });
                      }}
                      onContextMenu={(event) => {
                        if (isMobile) {
                          return;
                        }
                        event.preventDefault();
                        setDesktopSidebarView("flashcards");
                        navigate("/workspace/flashcards" as Route, {
                          openInNewPane: true,
                        });
                      }}
                    />
                    <SectionButton
                      dragHref={primaryFilesRoute}
                      icon={Files}
                      label="Open Files"
                      onClick={(event) => {
                        closeMobileSidebar();
                        if (!isMobile) {
                          void navigateToFilesRoot({
                            openInNewPane: event.altKey,
                          });
                          return;
                        }
                        void navigateToFilesRoot({
                          openInNewPane: false,
                        });
                      }}
                      onContextMenu={(event) => {
                        if (isMobile) {
                          return;
                        }
                        event.preventDefault();
                        void navigateToFilesRoot({ openInNewPane: true });
                      }}
                    />
                    <SectionButton
                      dragHref={"/workspace/tasks" as Route}
                      icon={ListChecks}
                      label="Open Tasks"
                      onClick={(event) => {
                        closeMobileSidebar();
                        navigate("/workspace/tasks" as Route, {
                          openInNewPane: !isMobile && event.altKey,
                        });
                      }}
                      onContextMenu={(event) => {
                        if (isMobile) {
                          return;
                        }
                        event.preventDefault();
                        navigate("/workspace/tasks" as Route, {
                          openInNewPane: true,
                        });
                      }}
                    />
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
          ) : sidebarView === "tasks" ? (
            <DeferredSidebarTaskPreview
              activeWorkspaceId={activeWorkspace?.workspaceId}
              closeMobileSidebar={closeMobileSidebar}
              navigate={navigate}
            />
          ) : sidebarView ? (
            <>
              <div
                aria-hidden={sidebarView !== "chat"}
                className={
                  mountedViews.has("chat")
                    ? `absolute inset-0 overflow-y-auto ${
                        sidebarView === "chat"
                          ? ""
                          : "pointer-events-none hidden"
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
                    pendingChatSlug={runtime.pendingChatSlug}
                    pinnedChats={filteredPinnedChats}
                  />
                ) : null}
              </div>
              <div
                aria-hidden={sidebarView !== "files"}
                className={
                  mountedViews.has("files")
                    ? `absolute inset-0 ${
                        sidebarView === "files"
                          ? ""
                          : "pointer-events-none hidden"
                      }`
                    : "hidden"
                }
              >
                {sidebarView === "files" ? (
                  <DeferredFilesSidebarPanel
                    currentFileId={currentFileId}
                    currentFolderId={currentFolderId}
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
                    ? `absolute inset-0 ${
                        sidebarView === "flashcards"
                          ? ""
                          : "pointer-events-none hidden"
                      }`
                    : "hidden"
                }
              >
                {mountedViews.has("flashcards") ? (
                  <FlashcardsSidebarPanel
                    active={sidebarView === "flashcards"}
                    activeSetId={currentFlashcardSetId}
                    workspaceUuid={workspaceUuid}
                  />
                ) : null}
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-start p-4">
              <SidebarEmptyState
                description="Pick a workspace surface above to load its actions, shortcuts, and context."
                icon={Sparkles}
                title="Choose a surface"
              />
            </div>
          )}
        </div>
      </TooltipProvider>
    </SidebarContent>
  );
}
