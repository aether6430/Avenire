"use client";

import type { Route } from "next";
import { useMemo, useState } from "react";
import {
  filterDashboardSidebarChats,
  resolveDashboardSidebarActiveChatSlug,
  resolveDashboardSidebarPrimaryChatRoute,
  toggleDashboardSidebarChatSearchState,
} from "@/components/dashboard/dashboard-sidebar-chat-runtime-model";
import type { DashboardSidebarView } from "@/components/dashboard/sidebar-startup";
import { useDashboardSidebarChatActions } from "@/components/dashboard/use-dashboard-sidebar-chat-actions";
import { useDashboardSidebarChatCollection } from "@/components/dashboard/use-dashboard-sidebar-chat-collection";
import { useDashboardSidebarChatEvents } from "@/components/dashboard/use-dashboard-sidebar-chat-events";
import { useDashboardSidebarChatSessionClose } from "@/components/dashboard/use-dashboard-sidebar-chat-session-close";
import type { ChatSummary } from "@/lib/chat-data";

type SidebarNavigate = (
  href: string,
  navigateOptions?: {
    openInNewPane?: boolean;
    replace?: boolean;
    scroll?: boolean;
  }
) => void;

export function useDashboardSidebarChats({
  activeChatSlugFromPath,
  activeChatSlugProp,
  activeWorkspaceId,
  isChatsRoute,
  initialChats,
  pathname,
  refreshRoute,
  routeView,
  sidebarView,
  workspaceUuid,
  navigate,
}: {
  activeChatSlugFromPath: string;
  activeChatSlugProp?: string;
  activeWorkspaceId?: string | null;
  initialChats: ChatSummary[];
  isChatsRoute: boolean;
  navigate: SidebarNavigate;
  pathname: string;
  refreshRoute: () => void;
  routeView: DashboardSidebarView;
  sidebarView: DashboardSidebarView;
  workspaceUuid: string | null;
}) {
  const [editingChatSlug, setEditingChatSlug] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [pendingChatSlug, setPendingChatSlug] = useState<string | null>(null);
  const [activeChatSlugOverride, setActiveChatSlugOverride] = useState<
    string | null
  >(null);

  const activeChatSlug = resolveDashboardSidebarActiveChatSlug({
    activeChatSlugFromPath,
    activeChatSlugOverride,
    activeChatSlugProp,
  });

  useDashboardSidebarChatSessionClose({
    activeChatSlug,
    routeView,
  });
  const collection = useDashboardSidebarChatCollection({
    activeWorkspaceId,
    initialChats,
    isChatsRoute,
    sidebarView,
    workspaceUuid,
  });
  const { chats, chatsLoadFailed, chatsLoading, loadChats, setChats } =
    collection;

  const primaryChatRoute = useMemo<Route>(
    () =>
      resolveDashboardSidebarPrimaryChatRoute({
        activeChatSlug,
        chats,
      }),
    [activeChatSlug, chats]
  );
  useDashboardSidebarChatEvents({
    activeChatSlug,
    loadChats,
    navigate,
    pathname,
    setActiveChatSlugOverride,
    setChats,
    setPendingChatSlug,
    workspaceUuid,
  });
  const actions = useDashboardSidebarChatActions({
    activeChatSlug,
    chats,
    navigate,
    refreshRoute,
    setActiveChatSlugOverride,
    setChats,
  });
  const { chatActionStatus, createChat, deleteChat, updateChat } = actions;

  const { filteredOtherChats, filteredPinnedChats, otherChats, pinnedChats } =
    useMemo(
      () =>
        filterDashboardSidebarChats({
          chats,
          query: chatSearchQuery,
        }),
      [chatSearchQuery, chats]
    );

  const toggleChatSearch = () => {
    setIsChatSearchOpen((current) => {
      const nextState = toggleDashboardSidebarChatSearchState({
        isOpen: current,
      });
      if (nextState.query !== null) {
        setChatSearchQuery(nextState.query);
      }
      return nextState.isOpen;
    });
  };

  return {
    activeChatSlug,
    chatActionStatus,
    chats,
    chatsLoadFailed,
    chatsLoading,
    chatSearchQuery,
    createChat,
    deleteChat,
    editingChatSlug,
    editingTitle,
    filteredOtherChats,
    filteredPinnedChats,
    isChatSearchOpen,
    otherChats,
    pendingChatSlug,
    pinnedChats,
    primaryChatRoute,
    setActiveChatSlugOverride,
    setChatSearchQuery,
    setEditingChatSlug,
    setEditingTitle,
    toggleChatSearch,
    updateChat,
  };
}
