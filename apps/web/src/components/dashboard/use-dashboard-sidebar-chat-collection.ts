"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardSidebarView } from "@/components/dashboard/sidebar-startup";
import { shouldLoadChatsForSidebar } from "@/components/dashboard/sidebar-startup";
import type { ChatSummary } from "@/lib/chat-data";
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
  const [chatsLoadFailed, setChatsLoadFailed] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const chatsWorkspaceRef = useRef<string | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (initialChats.length === 0) {
      return;
    }

    setChats((previous) => {
      if (previous === initialChats) {
        return previous;
      }
      if (
        previous.length === initialChats.length &&
        previous.every((chat, index) => chat.id === initialChats[index]?.id)
      ) {
        return previous;
      }
      return initialChats;
    });
  }, [initialChats]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (chatsWorkspaceRef.current === workspaceUuid) {
      return;
    }

    chatsWorkspaceRef.current = workspaceUuid;
    const cachedChats = workspaceUuid ? readCachedChats(workspaceUuid) : null;
    setChats(() => {
      if (cachedChats) {
        return cachedChats;
      }

      if (workspaceUuid && workspaceUuid === activeWorkspaceId) {
        return initialChats;
      }

      return [];
    });
  }, [activeWorkspaceId, hydrated, initialChats, workspaceUuid]);

  const loadChats = useCallback(async () => {
    setChatsLoading(true);
    setChatsLoadFailed(false);
    try {
      const response = await fetch("/api/chat/history", {
        cache: "no-store",
      });
      if (!response.ok) {
        setChats([]);
        setChatsLoadFailed(true);
        return;
      }
      const payload = (await response.json()) as { chats?: ChatSummary[] };
      const nextChats = payload.chats ?? [];
      setChats(nextChats);
      setChatsLoadFailed(false);
      if (workspaceUuid && chatsWorkspaceRef.current === workspaceUuid) {
        writeCachedChats(workspaceUuid, nextChats);
      }
    } catch {
      setChats([]);
      setChatsLoadFailed(true);
    } finally {
      setChatsLoading(false);
    }
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
    if (chatsWorkspaceRef.current !== workspaceUuid) {
      return;
    }
    writeCachedChats(workspaceUuid, chats);
  }, [chats, workspaceUuid]);

  return {
    chats,
    chatsLoadFailed,
    chatsLoading,
    loadChats,
    setChats,
  };
}
