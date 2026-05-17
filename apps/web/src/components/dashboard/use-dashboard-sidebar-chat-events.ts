"use client";

import type { Route } from "next";
import { type Dispatch, type SetStateAction, useEffect, useRef } from "react";
import {
  applyDashboardChatNameUpdate,
  applyDashboardChatStreamStatus,
  resolveDashboardPendingCreatedChat,
  shouldReloadDashboardChatsForInvalidation,
} from "@/components/dashboard/dashboard-sidebar-chat-events-runtime";
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

      const nextState = resolveDashboardPendingCreatedChat({
        activeChatSlug,
        detail,
        pathname,
        workspaceUuid,
      });
      if (!nextState) {
        return;
      }

      pendingCreatedChatRef.current = nextState.pendingCreatedChat;
      setActiveChatSlugOverride(nextState.activeChatSlugOverride);
      navigate(nextState.navigateTo as Route);
    };

    const onChatNameUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ChatNameUpdatedDetail>).detail;
      if (!(detail?.id && detail?.name)) {
        return;
      }

      setChats((previous) => {
        const nextState = applyDashboardChatNameUpdate({
          detail,
          pendingCreatedChat: pendingCreatedChatRef.current,
          previousChats: previous,
        });
        pendingCreatedChatRef.current = nextState.pendingCreatedChat;
        return nextState.chats;
      });
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

      if (!(detail.status === "ready" || detail.status === "error")) {
        return;
      }

      setChats((previousChats) => {
        const nextState = applyDashboardChatStreamStatus({
          detail,
          pendingCreatedChat: pendingCreatedChatRef.current,
          previousChats,
          previousPendingChatSlug: detail.chatId,
        });
        pendingCreatedChatRef.current = nextState.pendingCreatedChat;
        return nextState.chats;
      });
      setPendingChatSlug((previousPendingChatSlug) =>
        previousPendingChatSlug === detail.chatId
          ? null
          : previousPendingChatSlug
      );
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
      if (
        shouldReloadDashboardChatsForInvalidation({
          detail,
          workspaceUuid,
        })
      ) {
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
