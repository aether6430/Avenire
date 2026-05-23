"use client";

import type { Route } from "next";
import { useState } from "react";
import { parseDashboardSidebarResponse } from "@/components/dashboard/dashboard-sidebar-runtime-model";
import type { ChatSummary } from "@/lib/chat-data";

type SidebarNavigate = (
  href: string,
  navigateOptions?: {
    openInNewPane?: boolean;
    replace?: boolean;
    scroll?: boolean;
  }
) => void;

export function useDashboardSidebarChatActions({
  activeChatSlug,
  chats,
  navigate,
  refreshRoute,
  setChats,
}: {
  activeChatSlug: string;
  chats: ChatSummary[];
  navigate: SidebarNavigate;
  refreshRoute: () => void;
  setChats: React.Dispatch<React.SetStateAction<ChatSummary[]>>;
}) {
  const [chatActionStatus, setChatActionStatus] = useState<string | null>(null);

  const createChat = async () => {
    navigate("/workspace/chats/new" as Route);
  };

  const updateChat = async (
    chatSlug: string,
    updates: { pinned?: boolean; title?: string }
  ) => {
    setChatActionStatus(null);
    const data = await parseDashboardSidebarResponse<{ chat: ChatSummary }>(
      await fetch(`/api/chats/${chatSlug}`, {
        body: JSON.stringify(updates),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      })
    );

    if (!data?.chat) {
      setChatActionStatus("Unable to update Method.");
      return;
    }

    setChats((previous) =>
      previous.map((chat) => (chat.slug === chatSlug ? data.chat : chat))
    );
    setChatActionStatus(null);
  };

  const deleteChat = async (chatSlug: string) => {
    setChatActionStatus(null);
    const response = await fetch(
      `/api/chat?${new URLSearchParams({ id: chatSlug }).toString()}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      setChatActionStatus("Unable to delete Method.");
      return;
    }

    const remaining = chats.filter((chat) => chat.slug !== chatSlug);
    setChats(remaining);

    if (activeChatSlug === chatSlug) {
      navigate("/workspace/chats/new" as Route);
      refreshRoute();
    }
    setChatActionStatus(null);
  };

  return {
    chatActionStatus,
    createChat,
    deleteChat,
    updateChat,
  };
}
