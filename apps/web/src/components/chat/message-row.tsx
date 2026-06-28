"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import { memo } from "react";
import { PreviewMessage } from "@/components/chat/message";

export interface ChatMessageRowProps {
  addToolApprovalResponse: UseChatHelpers<UIMessage>["addToolApprovalResponse"];
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

export function getMessageSignature(message: UIMessage) {
  const parts = message.parts ?? [];
  const lastPart = parts.at(-1);

  return [
    message.id,
    message.role,
    parts.length,
    lastPart?.type ?? "",
    lastPart && "text" in lastPart ? (lastPart.text ?? "") : "",
    lastPart && "state" in lastPart ? (lastPart.state ?? "") : "",
  ].join("|");
}

function PureChatMessageRow({
  addToolApprovalResponse,
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
    <PreviewMessage
      addToolApprovalResponse={addToolApprovalResponse}
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
    prev.addToolApprovalResponse === next.addToolApprovalResponse &&
    prev.agentActivity === next.agentActivity &&
    prev.sendMessage === next.sendMessage &&
    prev.onRegenerate === next.onRegenerate &&
    getMessageSignature(prev.message) === getMessageSignature(next.message)
  );
});
