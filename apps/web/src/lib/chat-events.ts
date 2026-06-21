export const CHAT_NAME_UPDATED_EVENT = "avenire:chat-name-updated";
export const CHAT_STREAM_FINISHED_EVENT = "avenire:chat-stream-finished";
export const CHAT_STREAM_STATUS_EVENT = "avenire:chat-stream-status";

export interface ChatNameUpdatedDetail {
  icon?: string | null;
  id: string;
  name: string;
}

export interface ChatStreamFinishedDetail {
  chatId: string;
}

export type ChatStreamStatus = "error" | "ready" | "streaming" | "submitted";

export interface ChatStreamStatusDetail {
  chatId: string;
  status: ChatStreamStatus;
}

const activeChatStreamIds = new Set<string>();

export function isActiveChatStreamStatus(status: ChatStreamStatus | null) {
  return status === "submitted" || status === "streaming";
}

export function rememberChatStreamStatus(detail: ChatStreamStatusDetail) {
  if (isActiveChatStreamStatus(detail.status)) {
    activeChatStreamIds.add(detail.chatId);
    return;
  }

  activeChatStreamIds.delete(detail.chatId);
}

export function isChatStreamActive(chatId: string) {
  return activeChatStreamIds.has(chatId);
}
