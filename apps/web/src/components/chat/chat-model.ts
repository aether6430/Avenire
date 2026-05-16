import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "@avenire/ai/message-types";
import type { FileUIPart } from "ai";
import type { Attachment } from "@/components/chat/attachment";
import { normalizeMediaType } from "@/lib/media-type";

export type SendMessageInput = Parameters<
  UseChatHelpers<UIMessage>["sendMessage"]
>[0];
export type SendMessageOptions = Parameters<
  UseChatHelpers<UIMessage>["sendMessage"]
>[1];

export const ACTIVE_REPLY_MIN_HEIGHT = "calc(100dvh - 250px)";
export const EMPTY_COMPOSER_SHELL_CLASSNAME = "mx-auto mb-3 w-full max-w-3xl";
export const FLOATING_COMPOSER_SHELL_CLASSNAME =
  "mx-auto mb-3 w-full max-w-3xl";

export function createOptimisticUserMessage(
  message: SendMessageInput
): UIMessage | null {
  if (!message) {
    return null;
  }

  const text =
    "text" in message && typeof message.text === "string" ? message.text : "";
  const candidateFiles =
    "files" in message && Array.isArray(message.files) ? message.files : [];
  const files = candidateFiles.filter(
    (file): file is FileUIPart =>
      file.type === "file" &&
      typeof file.url === "string" &&
      file.url.trim().length > 0
  );

  if (text.trim().length === 0 && files.length === 0) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    parts: [
      ...(text.trim().length > 0 ? [{ type: "text" as const, text }] : []),
      ...files.map((file) => ({
        filename: file.filename,
        mediaType: file.mediaType,
        type: "file" as const,
        url: file.url,
      })),
    ],
    role: "user",
  } as UIMessage;
}

export function buildChatSubmissionFileParts(files: Attachment[]) {
  const localFileParts: FileUIPart[] = files
    .filter((attachment) => attachment.source === "local")
    .flatMap((attachment) => {
      if (!attachment.url || attachment.url.trim().length === 0) {
        return [];
      }

      const url = attachment.url.trim();
      if (!(url.startsWith("http://") || url.startsWith("https://"))) {
        return [];
      }

      return [
        {
          filename: attachment.name,
          mediaType: normalizeMediaType(attachment.contentType),
          type: "file",
          url,
        } satisfies FileUIPart,
      ];
    });

  const workspaceFileParts: FileUIPart[] = files
    .filter((attachment) => attachment.source === "workspace")
    .flatMap((attachment) => {
      if (!attachment.url || attachment.url.trim().length === 0) {
        return [];
      }

      return [
        {
          filename: attachment.name,
          mediaType: normalizeMediaType(attachment.contentType),
          type: "file",
          url: attachment.url,
        } satisfies FileUIPart,
      ];
    });

  return [...localFileParts, ...workspaceFileParts];
}

export function getDisplayedChatMessages(
  messages: UIMessage[],
  status: "submitted" | "streaming" | "ready" | "error"
) {
  const lastMessage = messages.at(-1);
  if (!(status === "submitted" && lastMessage?.role === "user")) {
    return messages;
  }

  return [
    ...messages,
    {
      id: `assistant-draft-${lastMessage.id}`,
      parts: [{ text: "", type: "text" }],
      role: "assistant",
    } as UIMessage,
  ];
}

export function getActiveReplyMessageId(displayedMessages: UIMessage[]) {
  for (let index = displayedMessages.length - 1; index >= 0; index -= 1) {
    const message = displayedMessages[index];
    if (message?.role === "assistant") {
      return message.id;
    }
    if (message?.role === "user") {
      break;
    }
  }

  return null;
}

export function getLatestUserMessageId(messages: UIMessage[]) {
  return (
    [...messages].reverse().find((message) => message.role === "user")?.id ??
    null
  );
}

export function getChatLayoutState({
  displayedMessages,
  pendingChatRoute,
  status,
}: {
  displayedMessages: UIMessage[];
  pendingChatRoute: string | null;
  status: "submitted" | "streaming" | "ready" | "error";
}) {
  const hasConversationSurface = displayedMessages.length > 0;
  const isEmptyState =
    !(hasConversationSurface || pendingChatRoute) &&
    status !== "submitted" &&
    status !== "streaming";
  const isTransitioningFromNewChat =
    !hasConversationSurface &&
    (status === "submitted" ||
      status === "streaming" ||
      pendingChatRoute !== null);

  return {
    hasConversationSurface,
    isEmptyState,
    isTransitioningFromNewChat,
    shouldUseCenteredComposerLayout: isEmptyState || isTransitioningFromNewChat,
  };
}
