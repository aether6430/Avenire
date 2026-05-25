"use client";

import type { ChatSummary } from "@avenire/database";
import { type Dispatch, type SetStateAction, useEffect } from "react";
import {
  applyDashboardChatInvalidation,
  applyDashboardChatNameUpdate,
  applyDashboardChatStreamStatus,
  shouldReloadDashboardChatsForInvalidation,
} from "@/components/dashboard/dashboard-sidebar-chat-events-runtime";
import {
  CHAT_NAME_UPDATED_EVENT,
  CHAT_STREAM_STATUS_EVENT,
  type ChatNameUpdatedDetail,
  type ChatStreamStatusDetail,
} from "@/lib/chat-events";

export function useDashboardSidebarChatEvents({
  loadChats,
  setChats,
  setPendingChatSlug,
  workspaceUuid,
}: {
  loadChats: () => Promise<void>;
  setChats: Dispatch<SetStateAction<ChatSummary[]>>;
  setPendingChatSlug: Dispatch<SetStateAction<string | null>>;
  workspaceUuid: string | null;
}) {
  useEffect(() => {
    const onChatNameUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ChatNameUpdatedDetail>).detail;
      if (!(detail?.id && detail?.name)) {
        return;
      }

      setChats((previous) =>
        applyDashboardChatNameUpdate({
          detail,
          previousChats: previous,
        })
      );
    };

    const onChatStreamStatus = (event: Event) => {
      const detail = (event as CustomEvent<ChatStreamStatusDetail>).detail;
      if (!detail?.chatId) {
        return;
      }

      setPendingChatSlug((previousPendingChatSlug) => {
        const nextState = applyDashboardChatStreamStatus({
          detail,
          previousPendingChatSlug,
        });
        if (nextState.shouldReload) {
          void loadChats();
        }
        return nextState.pendingChatSlug;
      });
    };

    window.addEventListener(CHAT_NAME_UPDATED_EVENT, onChatNameUpdated);
    window.addEventListener(CHAT_STREAM_STATUS_EVENT, onChatStreamStatus);

    return () => {
      window.removeEventListener(CHAT_NAME_UPDATED_EVENT, onChatNameUpdated);
      window.removeEventListener(CHAT_STREAM_STATUS_EVENT, onChatStreamStatus);
    };
  }, [loadChats, setChats, setPendingChatSlug]);

  useEffect(() => {
    const onWorkspaceInvalidated = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          kind?: string;
          payload?: {
            action?: string | null;
            chat?: unknown;
            chatSlug?: string | null;
          } | null;
          workspaceUuid?: string;
        }>
      ).detail;
      const patched = applyDashboardChatInvalidation({
        detail,
        previousChats: [],
        workspaceUuid,
      });
      if (patched) {
        setChats((previousChats) => {
          const nextChats =
            applyDashboardChatInvalidation({
              detail,
              previousChats,
              workspaceUuid,
            }) ?? previousChats;
          return nextChats;
        });
        return;
      }
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
  }, [loadChats, setChats, workspaceUuid]);
}
