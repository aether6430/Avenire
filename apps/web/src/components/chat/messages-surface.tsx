"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avenire/ui/components/card";
import { Warning as AlertCircle } from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import type { useChatMessages } from "@/components/chat/use-chat-messages";
import { getChatErrorMessage } from "@/lib/chat-errors";
import { ChatMessageRow } from "./message-row";
import type { MessagesProps } from "./messages-model";
import { getAssistantMessageState } from "./messages-model";

function MessagesError({
  error,
}: {
  error: NonNullable<MessagesProps["error"]>;
}) {
  return (
    <Card className="mx-auto mb-4 w-full max-w-3xl border-destructive/20 bg-destructive/8 text-destructive shadow-sm">
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
  );
}

export function ChatMessagesSurface({
  props,
  runtime,
}: {
  props: MessagesProps;
  runtime: ReturnType<typeof useChatMessages>;
}) {
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-14 bg-gradient-to-b from-background via-background/95 to-transparent transition-opacity duration-150"
        style={{ opacity: "var(--chat-edge-mask-top, 0)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 bg-gradient-to-t from-background via-background/95 to-transparent transition-opacity duration-150"
        style={{ opacity: "var(--chat-edge-mask-bottom, 0)" }}
      />
      <div
        className="no-scrollbar relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-0 pt-16 pb-6"
        ref={props.messagesContainerRef}
      >
        {props.error ? <MessagesError error={props.error} /> : null}

        <div
          className="relative mx-auto flex w-full max-w-3xl flex-col"
          ref={props.messagesContentRef}
        >
          {runtime.pastTurnMessages.length > 0 ? (
            <div
              className="relative w-full"
              style={{
                height: `${runtime.pastTurnsHeight}px`,
              }}
            >
              {runtime.virtualItems.map((virtualItem) => {
                const message = runtime.pastTurnMessages[virtualItem.index]!;
                const messageState = getAssistantMessageState(message, {
                  isStreaming: false,
                  status: props.status,
                });

                return (
                  <div
                    className="pb-6"
                    data-index={virtualItem.index}
                    data-message-id={message.id}
                    key={virtualItem.key}
                    ref={runtime.measurePastTurnElement}
                    style={
                      {
                        contentVisibility: "auto",
                        containIntrinsicSize: "320px",
                        left: 0,
                        position: "absolute",
                        top: 0,
                        transform: `translateY(${virtualItem.start}px)`,
                        width: "100%",
                      } as CSSProperties
                    }
                  >
                    <ChatMessageRow
                      agentActivity={null}
                      chatId={props.chatId}
                      isActiveReply={message.id === props.activeReplyMessageId}
                      isComplete={messageState.isComplete}
                      isReadonly={props.isReadonly}
                      isStreaming={messageState.isStreaming}
                      message={message}
                      onRegenerate={props.onRegenerate}
                      replyMinHeight={props.replyMinHeight}
                      sendMessage={props.sendMessage}
                      workspaceUuid={props.workspaceUuid}
                    />
                  </div>
                );
              })}
            </div>
          ) : null}

          {runtime.lastTurnMessages.length > 0 ? (
            <div
              className="relative w-full"
              style={{
                minHeight:
                  runtime.pastTurnMessages.length > 0
                    ? "var(--chat-scroll-inner-h)"
                    : undefined,
                paddingBottom: props.bottomSpacerHeight
                  ? `${props.bottomSpacerHeight}px`
                  : undefined,
              }}
            >
              <div className="flex flex-col gap-6">
                {runtime.lastTurnMessages.map((message, index) => {
                  const isStreamingMessage =
                    props.status === "streaming" &&
                    index === runtime.lastTurnMessages.length - 1 &&
                    message.role === "assistant";
                  const messageState = getAssistantMessageState(message, {
                    isStreaming: isStreamingMessage,
                    status: props.status,
                  });

                  return (
                    <ChatMessageRow
                      agentActivity={
                        message.role === "assistant" &&
                        message.id === props.activeReplyMessageId
                          ? props.agentActivity
                          : null
                      }
                      chatId={props.chatId}
                      isActiveReply={message.id === props.activeReplyMessageId}
                      isComplete={messageState.isComplete}
                      isReadonly={props.isReadonly}
                      isStreaming={messageState.isStreaming}
                      key={message.id}
                      message={message}
                      onRegenerate={props.onRegenerate}
                      replyMinHeight={props.replyMinHeight}
                      sendMessage={props.sendMessage}
                      workspaceUuid={props.workspaceUuid}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
