"use client";

import type { ChatSummary } from "@avenire/database";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadDashboardSidebarChats,
  resolveSidebarChatsForWorkspace,
  resolveSidebarChatsFromInitial,
  shouldPersistSidebarChatsToCache,
} from "@/components/dashboard/dashboard-sidebar-chat-collection-runtime";
import type { DashboardSidebarView } from "@/components/dashboard/sidebar-startup";
import { shouldLoadChatsForSidebar } from "@/components/dashboard/sidebar-startup";
import {
  readCachedChats,
  writeCachedChats,
} from "@/lib/dashboard-browser-cache";

export function useDashboardSidebarChatCollection({
  activeWorkspaceId,
  initialChats,
  isChatsRoute,
  sidebarView,
  workspaceUuid,
}: {
  activeWorkspaceId?: string | null;
  initialChats: ChatSummary[];
  isChatsRoute: boolean;
  sidebarView: DashboardSidebarView;
  workspaceUuid: string | null;
}) {
  const [chats, setChats] = useState<ChatSummary[]>(initialChats);
  const [chatsErrorMessage, setChatsErrorMessage] = useState<string | null>(
    null
  );
  const [chatsLoadFailed, setChatsLoadFailed] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const chatsWorkspaceRef = useRef<string | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    setChats((previous) => {
      return resolveSidebarChatsFromInitial({
        initialChats,
        previousChats: previous,
      });
    });
  }, [initialChats]);

  useEffect(() => {
    const nextState = resolveSidebarChatsForWorkspace({
      activeWorkspaceId,
      cachedChats: workspaceUuid ? readCachedChats(workspaceUuid) : null,
      hydrated,
      initialChats,
      trackedWorkspaceUuid: chatsWorkspaceRef.current,
      workspaceUuid,
    });
    if (!nextState) {
      return;
    }

    chatsWorkspaceRef.current = nextState.trackedWorkspaceUuid;
    setChats(() => nextState.chats);
  }, [activeWorkspaceId, hydrated, initialChats, workspaceUuid]);

  const loadChats = useCallback(async () => {
    setChatsLoading(true);
    setChatsLoadFailed(false);
    const result = await loadDashboardSidebarChats({
      fetchChats: () =>
        fetch("/api/chat/history", {
          cache: "no-store",
        }),
      trackedWorkspaceUuid: chatsWorkspaceRef.current,
      workspaceUuid,
      writeCachedChats,
    });
    setChats(result.chats);
    setChatsErrorMessage(result.errorMessage);
    setChatsLoadFailed(result.loadFailed);
    setChatsLoading(false);
  }, [workspaceUuid]);

  useEffect(() => {
    if (
      !shouldLoadChatsForSidebar({
        isChatsRoute,
        sidebarView,
      })
    ) {
      return;
    }

    void loadChats();
  }, [isChatsRoute, loadChats, sidebarView]);

  useEffect(() => {
    if (!workspaceUuid) {
      return;
    }
    if (
      !shouldPersistSidebarChatsToCache({
        trackedWorkspaceUuid: chatsWorkspaceRef.current,
        workspaceUuid,
      })
    ) {
      return;
    }
    writeCachedChats(workspaceUuid, chats);
  }, [chats, workspaceUuid]);

  return {
    chats,
    chatsErrorMessage,
    chatsLoadFailed,
    chatsLoading,
    loadChats,
    setChats,
  };
}
