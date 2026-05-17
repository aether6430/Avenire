"use client";

import { Spinner } from "@avenire/ui/components/spinner";
import { Sparkle as Sparkles } from "@phosphor-icons/react";
import type { Route } from "next";
import dynamic from "next/dynamic";
import type { DashboardSidebarRuntime } from "@/components/dashboard/use-dashboard-sidebar";
import { DashboardSidebarChatPanel } from "./dashboard-sidebar-chat-panel";
import { SidebarEmptyState } from "./dashboard-sidebar-shared";

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
            ? `absolute inset-0 overflow-y-auto ${
                sidebarView === "chat" ? "" : "pointer-events-none hidden"
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
            ? `absolute inset-0 ${
                sidebarView === "files" ? "" : "pointer-events-none hidden"
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
                sidebarView === "flashcards" ? "" : "pointer-events-none hidden"
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
  );
}
