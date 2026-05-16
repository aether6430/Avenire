"use client";

import type { Route } from "next";
import { type Dispatch, type SetStateAction, useEffect, useRef } from "react";
import type { ChatSummary } from "@/lib/chat-data";
import {
  CHAT_CREATED_EVENT,
  CHAT_NAME_UPDATED_EVENT,
  CHAT_STREAM_STATUS_EVENT,
  type ChatCreatedDetail,
  type ChatNameUpdatedDetail,
  type ChatStreamStatusDetail,
} from "@/lib/chat-events";

type SidebarNavigate = (
  href: string,
  navigateOptions?: {
    openInNewPane?: boolean;
    replace?: boolean;
    scroll?: boolean;
  }
) => void;

export function useDashboardSidebarChatEvents({
  activeChatSlug,
  loadChats,
  navigate,
  pathname,
  setActiveChatSlugOverride,
  setChats,
  setPendingChatSlug,
  workspaceUuid,
}: {
  activeChatSlug: string;
  loadChats: () => Promise<void>;
  navigate: SidebarNavigate;
  pathname: string;
  setActiveChatSlugOverride: Dispatch<SetStateAction<string | null>>;
  setChats: Dispatch<SetStateAction<ChatSummary[]>>;
  setPendingChatSlug: Dispatch<SetStateAction<string | null>>;
  workspaceUuid: string | null;
}) {
  const pendingCreatedChatRef = useRef<ChatSummary | null>(null);

  useEffect(() => {
    const onChatCreated = (event: Event) => {
      const detail = (event as CustomEvent<ChatCreatedDetail>).detail;
      if (!(detail?.id && detail?.title)) {
        return;
      }

      if (
        pathname === "/workspace/chats/new" ||
        activeChatSlug === "new" ||
        detail.fromId === "new"
      ) {
        pendingCreatedChatRef.current = {
          branching: null,
          createdAt: new Date().toISOString(),
          icon: null,
          id: detail.id,
          lastMessageAt: new Date().toISOString(),
          pinned: false,
          slug: detail.id,
          title: detail.title,
          updatedAt: new Date().toISOString(),
          workspaceId: workspaceUuid,
        };
        setActiveChatSlugOverride(detail.id);
        navigate(`/workspace/chats/${detail.id}` as Route);
      }
    };

    const onChatNameUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ChatNameUpdatedDetail>).detail;
      if (!(detail?.id && detail?.name)) {
        return;
      }

      if (pendingCreatedChatRef.current?.slug === detail.id) {
        pendingCreatedChatRef.current = {
          ...pendingCreatedChatRef.current,
          icon: detail.icon ?? pendingCreatedChatRef.current.icon ?? null,
          title: detail.name,
          updatedAt: new Date().toISOString(),
        };
      }

      setChats((previous) =>
        previous.map((chat) =>
          chat.slug === detail.id
            ? {
                ...chat,
                title: detail.name,
                icon: detail.icon ?? chat.icon ?? null,
                updatedAt: new Date().toISOString(),
              }
            : chat
        )
      );
    };

    const onChatStreamStatus = (event: Event) => {
      const detail = (event as CustomEvent<ChatStreamStatusDetail>).detail;
      if (!detail?.chatId) {
        return;
      }
      if (detail.status === "submitted" || detail.status === "streaming") {
        setPendingChatSlug(detail.chatId);
        return;
      }
      if (detail.status === "ready" || detail.status === "error") {
        if (detail.status === "ready") {
          const pendingCreatedChat = pendingCreatedChatRef.current;
          if (pendingCreatedChat?.slug === detail.chatId) {
            setChats((previous) => {
              if (
                previous.some((chat) => chat.slug === pendingCreatedChat.slug)
              ) {
                return previous;
              }
              return [pendingCreatedChat, ...previous];
            });
          }
        }
        if (detail.status === "error") {
          pendingCreatedChatRef.current = null;
        }
        setPendingChatSlug((previous) =>
          previous === detail.chatId ? null : previous
        );
        if (detail.status === "ready") {
          pendingCreatedChatRef.current = null;
        }
      }
    };

    window.addEventListener(CHAT_CREATED_EVENT, onChatCreated);
    window.addEventListener(CHAT_NAME_UPDATED_EVENT, onChatNameUpdated);
    window.addEventListener(CHAT_STREAM_STATUS_EVENT, onChatStreamStatus);

    return () => {
      window.removeEventListener(CHAT_CREATED_EVENT, onChatCreated);
      window.removeEventListener(CHAT_NAME_UPDATED_EVENT, onChatNameUpdated);
      window.removeEventListener(CHAT_STREAM_STATUS_EVENT, onChatStreamStatus);
    };
  }, [
    activeChatSlug,
    navigate,
    pathname,
    setActiveChatSlugOverride,
    setChats,
    setPendingChatSlug,
    workspaceUuid,
  ]);

  useEffect(() => {
    const onWorkspaceInvalidated = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          kind?: string;
          workspaceUuid?: string;
        }>
      ).detail;
      if (!detail?.workspaceUuid || detail.workspaceUuid !== workspaceUuid) {
        return;
      }

      if (detail.kind === "chat") {
        void loadChats();
      }
    };

    window.addEventListener(
      "avenire:workspace-data-invalidated",
      onWorkspaceInvalidated
    );
    return () => {
      window.removeEventListener(
        "avenire:workspace-data-invalidated",
        onWorkspaceInvalidated
      );
    };
  }, [loadChats, workspaceUuid]);
}
