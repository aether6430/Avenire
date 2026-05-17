"use client";

import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import type { FileUIPart } from "ai";
import type { Attachment } from "@/components/chat/attachment";
import type {
  SendMessageInput,
  SendMessageOptions,
} from "@/components/chat/chat-model";

export interface UseChatRuntimeProps {
  id: string;
  initialMessages: UIMessage[];
  initialPrompt?: string | null;
  selectedModel: string;
  workspaceUuid: string;
}

export interface ChatRuntime {
  activeReplyMessageId: string | null;
  agentActivity: AgentActivityData | null;
  attachments: Attachment[];
  bottomSpacerHeight: number;
  chatId: string;
  displayedMessages: UIMessage[];
  error: Error | undefined;
  getRootProps: () => Record<string, unknown>;
  handleStop: () => void;
  handleSubmit: (inputValue: string, files: Attachment[]) => Promise<void>;
  input: string;
  isAutoScrollEnabled: boolean;
  isDragActive: boolean;
  layoutState: {
    hasConversationSurface: boolean;
    isEmptyState: boolean;
    isTransitioningFromNewChat: boolean;
    shouldUseCenteredComposerLayout: boolean;
  };
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesContentRef: React.RefObject<HTMLDivElement | null>;
  reenableAutoScroll: (behavior?: ScrollBehavior) => void;
  regenerateFromMessage: (assistantMessageId: string) => Promise<void>;
  sendMessage: (
    message: SendMessageInput,
    options?: SendMessageOptions
  ) => Promise<void>;
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  status: "submitted" | "streaming" | "ready" | "error";
  workspaceUuid: string;
}

export const CHAT_RUNTIME_MAX_FILES = 3;

export function getChatHandoffMessages({
  currentMessages,
  pendingMessages,
}: {
  currentMessages: UIMessage[];
  pendingMessages: UIMessage[] | null;
}) {
  if (pendingMessages && pendingMessages.length > currentMessages.length) {
    return pendingMessages;
  }

  if (currentMessages.length > 0) {
    return currentMessages;
  }

  return pendingMessages;
}

export function getAutoPromptToSend({
  chatId,
  initialPrompt,
  lastAutoPrompt,
  messageCount,
  status,
}: {
  chatId: string;
  initialPrompt?: string | null;
  lastAutoPrompt: string | null;
  messageCount: number;
  status: "submitted" | "streaming" | "ready" | "error";
}) {
  if (chatId !== "new") {
    return null;
  }

  const prompt = initialPrompt?.trim();
  if (!prompt || lastAutoPrompt === prompt) {
    return null;
  }
  if (status !== "ready" || messageCount > 0) {
    return null;
  }

  return prompt;
}

export function buildRegenerationRequest(
  messages: UIMessage[],
  assistantMessageId: string
): {
  message: SendMessageInput;
  preservedMessages: UIMessage[];
} | null {
  const targetIndex = messages.findIndex(
    (message) => message.id === assistantMessageId
  );
  if (targetIndex <= 0 || messages[targetIndex]?.role !== "assistant") {
    return null;
  }

  let userIndex = targetIndex - 1;
  while (userIndex >= 0 && messages[userIndex]?.role !== "user") {
    userIndex -= 1;
  }
  if (userIndex < 0) {
    return null;
  }

  const userMessage = messages[userIndex];
  const userText = userMessage.parts
    .filter(
      (
        part
      ): part is Extract<
        (typeof userMessage.parts)[number],
        { type: "text"; text: string }
      > => part.type === "text"
    )
    .map((part) => part.text)
    .join("\n")
    .trim();
  const userFiles: FileUIPart[] = userMessage.parts
    .filter(
      (
        part
      ): part is Extract<
        (typeof userMessage.parts)[number],
        { type: "file"; url: string }
      > => part.type === "file" && typeof part.url === "string"
    )
    .map((part) => ({
      filename: part.filename,
      mediaType: part.mediaType,
      type: "file",
      url: part.url,
    }));

  return {
    message: {
      text: userText,
      ...(userFiles.length > 0 ? { files: userFiles } : {}),
    },
    preservedMessages: messages.slice(0, userIndex),
  };
}

export function willExceedChatAttachmentLimit({
  currentCount,
  incomingCount,
  maxFiles = CHAT_RUNTIME_MAX_FILES,
}: {
  currentCount: number;
  incomingCount: number;
  maxFiles?: number;
}) {
  return currentCount + incomingCount > maxFiles;
}

export function getChatAttachmentLimitDescription(
  maxFiles = CHAT_RUNTIME_MAX_FILES
) {
  return `You can only upload up to ${maxFiles} files per message.`;
}
