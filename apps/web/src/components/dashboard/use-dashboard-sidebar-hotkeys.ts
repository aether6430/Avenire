"use client";

import { useHotkey } from "@tanstack/react-hotkeys";
import type { Route } from "next";
import { isTypingTarget } from "@/components/dashboard/dashboard-sidebar-runtime-model";
import type { DashboardSidebarView } from "@/components/dashboard/sidebar-startup";
import type { ChatSummary } from "@/lib/chat-data";
import { commandPaletteActions } from "@/stores/commandPaletteStore";
import { filesUiActions } from "@/stores/filesUiStore";

type SidebarNavigate = (
  href: string,
  navigateOptions?: {
    openInNewPane?: boolean;
    replace?: boolean;
    scroll?: boolean;
  }
) => void;

function shouldIgnoreGlobalHotkey(event: KeyboardEvent) {
  const activeElement = document.activeElement;
  return isTypingTarget(event.target) || isTypingTarget(activeElement);
}

export function useDashboardSidebarHotkeys({
  activeChatSlug,
  activeView,
  chats,
  createChat,
  isChatsRoute,
  navigate,
  navigateToFilesRoot,
  pathname,
  resetEditingChat,
}: {
  activeChatSlug: string;
  activeView: DashboardSidebarView;
  chats: ChatSummary[];
  createChat: () => Promise<void>;
  isChatsRoute: boolean;
  navigate: SidebarNavigate;
  navigateToFilesRoot: (options?: { openInNewPane?: boolean }) => Promise<void>;
  pathname: string;
  resetEditingChat: () => void;
}) {
  useHotkey(
    "Mod+1",
    (event) => {
      event.preventDefault();
      if (!isChatsRoute) {
        const chatSlug = activeChatSlug || chats[0]?.slug;
        if (chatSlug) {
          navigate(`/workspace/chats/${chatSlug}` as Route);
          return;
        }
        navigate("/workspace/chats/new" as Route);
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+2",
    (event) => {
      event.preventDefault();
      if (!pathname.startsWith("/workspace/flashcards")) {
        navigate("/workspace/flashcards" as Route);
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+3",
    (event) => {
      event.preventDefault();
      if (!pathname.startsWith("/workspace/tasks")) {
        navigate("/workspace/tasks" as Route);
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+4",
    (event) => {
      event.preventDefault();
      if (!pathname.startsWith("/workspace/files")) {
        void navigateToFilesRoot();
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+N",
    (event) => {
      event.preventDefault();
      resetEditingChat();
      void createChat();
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Shift+P",
    (event) => {
      event.preventDefault();
      commandPaletteActions.open();
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Shift+N",
    (event) => {
      event.preventDefault();
      if (activeView === "files") {
        filesUiActions.emitIntent("createFolder");
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+U",
    (event) => {
      event.preventDefault();
      if (activeView === "files") {
        filesUiActions.emitIntent("uploadFile");
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Shift+U",
    (event) => {
      event.preventDefault();
      if (activeView === "files") {
        filesUiActions.emitIntent("uploadFolder");
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+O",
    (event) => {
      event.preventDefault();
      if (activeView === "files") {
        filesUiActions.emitIntent("openSelection");
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Delete",
    (event) => {
      if (isTypingTarget(event.target)) {
        return;
      }
      event.preventDefault();
      if (activeView === "files") {
        filesUiActions.emitIntent("deleteSelection");
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Z",
    (event) => {
      if (shouldIgnoreGlobalHotkey(event)) {
        return;
      }
      event.preventDefault();
      if (activeView === "files") {
        filesUiActions.emitIntent("undoMutation");
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Shift+Z",
    (event) => {
      if (shouldIgnoreGlobalHotkey(event)) {
        return;
      }
      event.preventDefault();
      if (activeView === "files") {
        filesUiActions.emitIntent("redoMutation");
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Y",
    (event) => {
      if (shouldIgnoreGlobalHotkey(event)) {
        return;
      }
      event.preventDefault();
      if (activeView === "files") {
        filesUiActions.emitIntent("redoMutation");
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Alt+ArrowLeft",
    (event) => {
      if (shouldIgnoreGlobalHotkey(event)) {
        return;
      }
      event.preventDefault();
      if (activeView === "files") {
        filesUiActions.emitIntent("goParent");
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Shift+M",
    (event) => {
      event.preventDefault();
      if (activeView === "files") {
        filesUiActions.emitIntent("moveSelectionUp");
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Shift+O",
    (event) => {
      event.preventDefault();
      if (activeView === "files") {
        filesUiActions.emitIntent("newNote");
      }
    },
    { ignoreInputs: true }
  );

  useHotkey(
    "Mod+Shift+L",
    (event) => {
      event.preventDefault();
      if (activeView === "files") {
        filesUiActions.emitIntent("importLink");
      }
    },
    { ignoreInputs: true }
  );
}
