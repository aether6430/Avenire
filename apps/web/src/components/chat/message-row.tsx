"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import { memo } from "react";
import { getMessageSignature } from "@/components/chat/message-model";
import { PreviewMessageSurface } from "@/components/chat/message-surface";

export { getMessageSignature } from "@/components/chat/message-model";

export interface ChatMessageRowProps {
  agentActivity: AgentActivityData | null;
  chatId: string;
  isActiveReply: boolean;
  isComplete: boolean;
  isReadonly: boolean;
  isStreaming: boolean;
  message: UIMessage;
  onRegenerate: (messageId: string) => void;
  replyMinHeight?: string;
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  workspaceUuid: string;
}

function PureChatMessageRow({
  agentActivity,
  chatId,
  isActiveReply,
  isComplete,
  isReadonly,
  isStreaming,
  message,
  onRegenerate,
  replyMinHeight,
  sendMessage,
  workspaceUuid,
}: ChatMessageRowProps) {
  return (
    <PreviewMessageSurface
      agentActivity={agentActivity}
      chatId={chatId}
      isActiveReply={isActiveReply}
      isComplete={isComplete}
      isReadonly={isReadonly}
      isStreaming={isStreaming}
      message={message}
      onRegenerate={onRegenerate}
      replyMinHeight={replyMinHeight}
      sendMessage={sendMessage}
      workspaceUuid={workspaceUuid}
    />
  );
}

export const ChatMessageRow = memo(PureChatMessageRow, (prev, next) => {
  return (
    prev.chatId === next.chatId &&
    prev.isActiveReply === next.isActiveReply &&
    prev.isComplete === next.isComplete &&
    prev.isReadonly === next.isReadonly &&
    prev.isStreaming === next.isStreaming &&
    prev.replyMinHeight === next.replyMinHeight &&
    prev.workspaceUuid === next.workspaceUuid &&
    prev.agentActivity === next.agentActivity &&
    prev.sendMessage === next.sendMessage &&
    prev.onRegenerate === next.onRegenerate &&
    getMessageSignature(prev.message) === getMessageSignature(next.message)
  );
});
