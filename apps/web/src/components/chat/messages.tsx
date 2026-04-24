"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avenire/ui/components/card";
import { Warning as AlertCircle } from "@phosphor-icons/react";
import { measureElement, useVirtualizer } from "@tanstack/react-virtual";
import { memo, type RefObject } from "react";
import { PreviewMessage } from "@/components/chat/message";
import { Overview } from "@/components/chat/overview";
import { getChatErrorMessage } from "@/lib/chat-errors";

interface MessagesProps {
  activeReplyMessageId?: string | null;
  agentActivity: AgentActivityData | null;
  bottomSpacerHeight: number;
  chatId: string;
  error: UseChatHelpers<UIMessage>["error"];
  isEmpty: boolean;
  isReadonly: boolean;
  messages: UseChatHelpers<UIMessage>["messages"];
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesContentRef: RefObject<HTMLDivElement | null>;
  onRegenerate: (messageId: string) => void;
  replyMinHeight?: string;
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  status: UseChatHelpers<UIMessage>["status"];
  userName?: string;
  workspaceUuid: string;
}

const getMessageSignature = (message: UIMessage) => {
  const lastPart = message.parts?.at(-1);
  return [
    message.id,
    message.role,
    message.parts?.length ?? 0,
    lastPart?.type ?? "",
    lastPart && "text" in lastPart ? (lastPart.text ?? "") : "",
    lastPart && "state" in lastPart ? (lastPart.state ?? "") : "",
  ].join("|");
};

const haveMessagesChanged = (
  prevMessages: UseChatHelpers<UIMessage>["messages"],
  nextMessages: UseChatHelpers<UIMessage>["messages"]
) => {
  if (prevMessages.length !== nextMessages.length) {
    return true;
  }
  return prevMessages.some(
    (message, index) =>
      getMessageSignature(message) !== getMessageSignature(nextMessages[index])
  );
};

function PureMessages({
  activeReplyMessageId,
  agentActivity,
  bottomSpacerHeight,
  chatId,
  status,
  messages,
  error,
  onRegenerate,
  sendMessage,
  isReadonly,
  workspaceUuid,
  userName,
  messagesContainerRef,
  messagesContentRef,
  isEmpty,
  replyMinHeight,
}: MessagesProps) {
  const isCenteredEmptyState = isEmpty && messages.length === 0;

  const virtualizer = useVirtualizer({
    count: messages.length,
    estimateSize: () => 200,
    getScrollElement: () => messagesContainerRef.current,
    measureElement,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div
        className={
          isCenteredEmptyState
            ? "no-scrollbar relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-3 py-6 sm:px-0 sm:py-10"
            : "no-scrollbar relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-3 pt-16 pb-6 sm:px-0 sm:pt-6 sm:pb-6"
        }
        ref={messagesContainerRef}
      >
        {error && (
          <Card className="mx-auto w-full max-w-3xl border-destructive/20 bg-destructive/10 text-destructive">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <CardTitle className="text-base">Message Error</CardTitle>
              </div>
              <CardDescription className="text-destructive/80">
                {getChatErrorMessage(error)}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-destructive/80 text-sm">
              <p>If the issue repeats, try again or contact support.</p>
            </CardContent>
          </Card>
        )}
        {isEmpty && (
          <div className="flex flex-1 items-center justify-center">
            <Overview userName={userName} />
          </div>
        )}

        {messages.length > 0 && (
          <div
            className="relative w-full"
            ref={messagesContentRef}
            style={{
              // The trailing spacer creates temporary scroll range so the latest
              // user message can sit at the top while the assistant fills in below.
              height: `${virtualizer.getTotalSize() + bottomSpacerHeight}px`,
            }}
          >
            {virtualItems.map((virtualItem) => {
              const index = virtualItem.index;
              const message = messages[index];
              const isLast = messages.length - 1 === index;
              const isLoading = status === "streaming" && isLast;
              const showAgentActivity =
                isLoading && message.role === "assistant"
                  ? agentActivity
                  : null;
              const lastPart = message.parts?.at(-1);
              const lastPartDone =
                !(lastPart && "state" in lastPart) ||
                (lastPart as { state?: string }).state !== "input-streaming";
              const isComplete =
                message.role !== "assistant"
                  ? true
                  : lastPartDone && !isLoading && status !== "submitted";

              return (
                <div
                  className={isLast ? undefined : "pb-6"}
                  data-index={virtualItem.index}
                  data-message-id={message.id}
                  key={virtualItem.key}
                  ref={virtualizer.measureElement}
                  style={{
                    left: 0,
                    position: "absolute",
                    top: 0,
                    transform: `translateY(${virtualItem.start}px)`,
                    width: "100%",
                  }}
                >
                  <PreviewMessage
                    agentActivity={showAgentActivity}
                    chatId={chatId}
                    isActiveReply={message.id === activeReplyMessageId}
                    isComplete={isComplete}
                    isReadonly={isReadonly}
                    isStreaming={isLoading}
                    message={message}
                    onRegenerate={onRegenerate}
                    replyMinHeight={replyMinHeight}
                    sendMessage={sendMessage}
                    workspaceUuid={workspaceUuid}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (nextProps.status === "streaming") {
    return false;
  }
  if (prevProps.status !== nextProps.status) {
    return false;
  }
  if (prevProps.workspaceUuid !== nextProps.workspaceUuid) {
    return false;
  }
  return !haveMessagesChanged(prevProps.messages, nextProps.messages);
});
