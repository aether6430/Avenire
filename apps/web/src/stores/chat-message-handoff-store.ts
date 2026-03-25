"use client";

import { create } from "zustand";
import type { UIMessage } from "@avenire/ai/message-types";

interface ChatMessageHandoffState {
  messagesByChatId: Record<string, UIMessage[]>;
}

const INITIAL_STATE: ChatMessageHandoffState = {
  messagesByChatId: {},
};

export const useChatMessageHandoffStore = create<ChatMessageHandoffState>()(() => ({
  ...INITIAL_STATE,
}));

export const chatMessageHandoffActions = {
  consume(chatId: string) {
    const messages =
      useChatMessageHandoffStore.getState().messagesByChatId[chatId] ?? null;
    if (!messages) {
      return null;
    }

    useChatMessageHandoffStore.setState((state) => {
      const next = { ...state.messagesByChatId };
      delete next[chatId];
      return { messagesByChatId: next };
    });

    return messages;
  },
  prime(chatId: string, messages: UIMessage[]) {
    if (!chatId || messages.length === 0) {
      return;
    }

    useChatMessageHandoffStore.setState((state) => ({
      messagesByChatId: {
        ...state.messagesByChatId,
        [chatId]: messages,
      },
    }));
  },
  clear(chatId: string) {
    useChatMessageHandoffStore.setState((state) => {
      if (!(chatId in state.messagesByChatId)) {
        return state;
      }
      const next = { ...state.messagesByChatId };
      delete next[chatId];
      return { messagesByChatId: next };
    });
  },
};
