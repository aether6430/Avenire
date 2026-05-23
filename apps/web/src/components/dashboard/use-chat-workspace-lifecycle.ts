"use client";

import type { UIMessage } from "@avenire/ai/message-types";
import { useEffect, useRef } from "react";
import { resolveChatWorkspaceInitialMessages } from "@/components/dashboard/chat-workspace-model";
import {
  CHAT_NAME_UPDATED_EVENT,
  CHAT_STREAM_STATUS_EVENT,
  type ChatNameUpdatedDetail,
  type ChatStreamStatusDetail,
} from "@/lib/chat-events";
import { chatMessageHandoffActions } from "@/stores/chat-message-handoff-store";

export function useChatWorkspaceLifecycle({
  chatIcon,
  chatSlug,
  currentChatSlug,
  initialMessages,
  resetShareState,
  setActiveChatSlug,
  setChatMetaOverride,
  setIsPending,
  setResolvedInitialMessages,
}: {
  chatIcon?: string | null;
  chatSlug: string;
  currentChatSlug: string;
  initialMessages: UIMessage[];
  resetShareState: () => void;
  setActiveChatSlug: (value: string) => void;
  setChatMetaOverride: (
    value: {
      icon: string | null;
      slug: string;
      title: string;
    } | null
  ) => void;
  setIsPending: (value: boolean) => void;
  setResolvedInitialMessages: (value: UIMessage[]) => void;
}) {
  const previousChatSlugRef = useRef(chatSlug);

  useEffect(() => {
    if (previousChatSlugRef.current === chatSlug) {
      return;
    }

    previousChatSlugRef.current = chatSlug;
    setActiveChatSlug(chatSlug);
    setChatMetaOverride(null);
    resetShareState();
    setIsPending(false);
    setResolvedInitialMessages(
      resolveChatWorkspaceInitialMessages({
        initialMessages,
        pendingMessages:
          initialMessages.length > 0
            ? null
            : chatMessageHandoffActions.consume(chatSlug),
      })
    );
  }, [
    chatSlug,
    initialMessages,
    resetShareState,
    setActiveChatSlug,
    setChatMetaOverride,
    setIsPending,
    setResolvedInitialMessages,
  ]);

  useEffect(() => {
    if (initialMessages.length === 0) {
      return;
    }

    setResolvedInitialMessages(initialMessages);
  }, [initialMessages, setResolvedInitialMessages]);

  useEffect(() => {
    const onChatNameUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ChatNameUpdatedDetail>).detail;
      if (!(detail?.id && detail?.name)) {
        return;
      }
      if (currentChatSlug !== "new" && detail.id !== currentChatSlug) {
        return;
      }
      setChatMetaOverride({
        icon: detail.icon ?? chatIcon ?? null,
        slug: currentChatSlug,
        title: detail.name,
      });
    };

    window.addEventListener(CHAT_NAME_UPDATED_EVENT, onChatNameUpdated);
    return () => {
      window.removeEventListener(CHAT_NAME_UPDATED_EVENT, onChatNameUpdated);
    };
  }, [chatIcon, currentChatSlug, setChatMetaOverride]);

  useEffect(() => {
    const onChatStreamStatus = (event: Event) => {
      const detail = (event as CustomEvent<ChatStreamStatusDetail>).detail;
      if (!detail?.chatId) {
        return;
      }
      if (currentChatSlug !== "new" && detail.chatId !== currentChatSlug) {
        return;
      }
      setIsPending(
        detail.status === "submitted" || detail.status === "streaming"
      );
    };

    window.addEventListener(CHAT_STREAM_STATUS_EVENT, onChatStreamStatus);
    return () => {
      window.removeEventListener(CHAT_STREAM_STATUS_EVENT, onChatStreamStatus);
    };
  }, [currentChatSlug, setIsPending]);
}
