"use client";

export const CHAT_COMPOSER_SEND_MODE_STORAGE_KEY = "chat-composer-send-mode";

export type ChatComposerSendMode = "enter" | "mod-enter";

export const DEFAULT_CHAT_COMPOSER_SEND_MODE: ChatComposerSendMode = "enter";

export function normalizeChatComposerSendMode(
  value: unknown
): ChatComposerSendMode {
  return value === "mod-enter" ? "mod-enter" : "enter";
}
