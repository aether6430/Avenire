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
import {
  type CSSProperties,
  memo,
  type RefObject,
  useDeferredValue,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import {
  ChatMessageRow,
  getMessageSignature,
} from "@/components/chat/message-row";
import { getChatErrorMessage } from "@/lib/chat-errors";

interface MessagesProps {
  activeReplyMessageId?: string | null;
  agentActivity: AgentActivityData | null;
  bottomSpacerHeight: number;
  chatId: string;
  error: UseChatHelpers<UIMessage>["error"];
  isReadonly: boolean;
  messages: UseChatHelpers<UIMessage>["messages"];
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesContentRef: RefObject<HTMLDivElement | null>;
  onRegenerate: (messageId: string) => void;
  replyMinHeight?: string;
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  status: UseChatHelpers<UIMessage>["status"];
  workspaceUuid: string;
}

function haveMessagesChanged(
  prevMessages: UseChatHelpers<UIMessage>["messages"],
  nextMessages: UseChatHelpers<UIMessage>["messages"]
) {
  if (prevMessages.length !== nextMessages.length) {
    return true;
  }

  return prevMessages.some(
    (message, index) =>
      getMessageSignature(message) !== getMessageSignature(nextMessages[index]!)
  );
}

function getAssistantMessageState(
  message: UIMessage,
  isStreaming: boolean,
  status: UseChatHelpers<UIMessage>["status"]
) {
  const lastPart = message.parts?.at(-1);
  const lastPartDone =
    !(lastPart && "state" in lastPart) ||
    (lastPart as { state?: string }).state !== "input-streaming";

  return {
    isComplete:
      message.role !== "assistant"
        ? true
        : lastPartDone && !isStreaming && status !== "submitted",
    isStreaming,
  };
}

function splitTurnMessages(messages: UseChatHelpers<UIMessage>["messages"]) {
  let latestUserMessageIndex = -1;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      latestUserMessageIndex = index;
      break;
    }
  }

  if (latestUserMessageIndex < 0) {
    return {
      lastTurnMessages: [],
      pastTurnMessages: messages,
    };
  }

  return {
    lastTurnMessages: messages.slice(latestUserMessageIndex),
    pastTurnMessages: messages.slice(0, latestUserMessageIndex),
  };
}

const EDGE_MASK_SCROLL_DISTANCE_PX = 44;

function updateChatEdgeMask(host: HTMLElement, container: HTMLElement) {
  const maxScrollTop = Math.max(
    0,
    container.scrollHeight - container.clientHeight
  );
  if (maxScrollTop === 0) {
    host.style.setProperty("--chat-edge-mask-top", "0");
    host.style.setProperty("--chat-edge-mask-bottom", "0");
    return;
  }

  const scrollTop = container.scrollTop;
  const topOpacity = Math.min(1, scrollTop / EDGE_MASK_SCROLL_DISTANCE_PX);
  const bottomOpacity = Math.min(
    1,
    (maxScrollTop - scrollTop) / EDGE_MASK_SCROLL_DISTANCE_PX
  );

  host.style.setProperty("--chat-edge-mask-top", topOpacity.toFixed(3));
  host.style.setProperty("--chat-edge-mask-bottom", bottomOpacity.toFixed(3));
}

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

function PureMessages({
  activeReplyMessageId,
  agentActivity,
  bottomSpacerHeight,
  chatId,
  error,
  isReadonly,
  messages,
  messagesContainerRef,
  messagesContentRef,
  onRegenerate,
  replyMinHeight,
  sendMessage,
  status,
  workspaceUuid,
}: MessagesProps) {
  const deferredMessages = useDeferredValue(messages);
  const renderMessages =
    status === "streaming" || status === "submitted"
      ? messages
      : deferredMessages;

  const { lastTurnMessages, pastTurnMessages } = useMemo(
    () => splitTurnMessages(renderMessages),
    [renderMessages]
  );

  const virtualizer = useVirtualizer({
    count: pastTurnMessages.length,
    estimateSize: () => 220,
    getItemKey: (index) => pastTurnMessages[index]?.id ?? index,
    getScrollElement: () => messagesContainerRef.current,
    measureElement,
    overscan: 6,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const pastTurnsHeight = virtualizer.getTotalSize();
  const maskFrameRef = useRef(0);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    const host = container?.parentElement;
    const content = messagesContentRef.current;
    if (!(container && host)) {
      return;
    }

    const updateMask = () => {
      maskFrameRef.current = 0;
      updateChatEdgeMask(host, container);
    };

    const scheduleMaskUpdate = () => {
      if (maskFrameRef.current) {
        return;
      }

      maskFrameRef.current = window.requestAnimationFrame(updateMask);
    };

    updateMask();

    const resizeObserver = new ResizeObserver(scheduleMaskUpdate);
    resizeObserver.observe(container);
    if (content) {
      resizeObserver.observe(content);
    }

    container.addEventListener("scroll", scheduleMaskUpdate, {
      passive: true,
    });
    window.addEventListener("resize", scheduleMaskUpdate, { passive: true });

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("scroll", scheduleMaskUpdate);
      window.removeEventListener("resize", scheduleMaskUpdate);
      host.style.setProperty("--chat-edge-mask-top", "0");
      host.style.setProperty("--chat-edge-mask-bottom", "0");
      if (maskFrameRef.current) {
        window.cancelAnimationFrame(maskFrameRef.current);
        maskFrameRef.current = 0;
      }
    };
  }, [messagesContainerRef, messagesContentRef, status, renderMessages.length]);

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
        ref={messagesContainerRef}
      >
        {error ? <MessagesError error={error} /> : null}

        <div
          className="relative mx-auto flex w-full max-w-3xl flex-col"
          ref={messagesContentRef}
        >
          {pastTurnMessages.length > 0 ? (
            <div
              className="relative w-full"
              style={{
                height: `${pastTurnsHeight}px`,
              }}
            >
              {virtualItems.map((virtualItem) => {
                const message = pastTurnMessages[virtualItem.index]!;
                const messageState = getAssistantMessageState(
                  message,
                  false,
                  status
                );

                return (
                  <div
                    className="pb-6"
                    data-index={virtualItem.index}
                    data-message-id={message.id}
                    key={virtualItem.key}
                    ref={virtualizer.measureElement}
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
                      chatId={chatId}
                      isActiveReply={message.id === activeReplyMessageId}
                      isComplete={messageState.isComplete}
                      isReadonly={isReadonly}
                      isStreaming={messageState.isStreaming}
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
          ) : null}

          {lastTurnMessages.length > 0 ? (
            <div
              className="relative w-full"
              style={{
                minHeight:
                  pastTurnMessages.length > 0
                    ? "var(--chat-scroll-inner-h)"
                    : undefined,
                paddingBottom: bottomSpacerHeight
                  ? `${bottomSpacerHeight}px`
                  : undefined,
              }}
            >
              <div className="flex flex-col gap-6">
                {lastTurnMessages.map((message, index) => {
                  const isStreamingMessage =
                    status === "streaming" &&
                    index === lastTurnMessages.length - 1 &&
                    message.role === "assistant";
                  const messageState = getAssistantMessageState(
                    message,
                    isStreamingMessage,
                    status
                  );

                  return (
                    <ChatMessageRow
                      agentActivity={
                        message.role === "assistant" &&
                        message.id === activeReplyMessageId
                          ? agentActivity
                          : null
                      }
                      chatId={chatId}
                      isActiveReply={message.id === activeReplyMessageId}
                      isComplete={messageState.isComplete}
                      isReadonly={isReadonly}
                      isStreaming={messageState.isStreaming}
                      key={message.id}
                      message={message}
                      onRegenerate={onRegenerate}
                      replyMinHeight={replyMinHeight}
                      sendMessage={sendMessage}
                      workspaceUuid={workspaceUuid}
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

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.chatId !== nextProps.chatId) {
    return false;
  }
  if (prevProps.status !== nextProps.status) {
    return false;
  }
  if (prevProps.bottomSpacerHeight !== nextProps.bottomSpacerHeight) {
    return false;
  }
  if (prevProps.activeReplyMessageId !== nextProps.activeReplyMessageId) {
    return false;
  }
  if (prevProps.isReadonly !== nextProps.isReadonly) {
    return false;
  }
  if (prevProps.workspaceUuid !== nextProps.workspaceUuid) {
    return false;
  }
  if (prevProps.error !== nextProps.error) {
    return false;
  }
  if (prevProps.agentActivity !== nextProps.agentActivity) {
    return false;
  }
  if (prevProps.onRegenerate !== nextProps.onRegenerate) {
    return false;
  }
  if (prevProps.replyMinHeight !== nextProps.replyMinHeight) {
    return false;
  }
  if (prevProps.sendMessage !== nextProps.sendMessage) {
    return false;
  }

  return !haveMessagesChanged(prevProps.messages, nextProps.messages);
});
