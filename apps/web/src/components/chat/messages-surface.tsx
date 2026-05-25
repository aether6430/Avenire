"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import { Card, CardContent } from "@avenire/ui/components/card";
import { Warning as AlertCircle } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import { memo } from "react";
import {
  getMessageSignature,
  groupRenderableBlocks,
  isToolPart,
  preferTransientParts,
  splitMessageParts,
  TOOL_ACTIVITY_AGENT_TYPES,
  toAgentActivityActions,
} from "@/components/chat/message-model";
import {
  MessageAttachments,
  MessageRenderParts,
} from "@/components/chat/message-parts";
import type { useChatMessages } from "@/components/chat/use-chat-messages";
import { getChatErrorMessage } from "@/lib/chat-errors";
import { cn } from "@/lib/utils";
import type { MessagesProps } from "./messages-model";
import { getAssistantMessageState } from "./messages-model";

const ChatActions = dynamic(
  () =>
    import("@/components/chat/chat-actions").then(
      (module) => module.ChatActions
    ),
  { ssr: false }
);

const MessageGeneratedArtifacts = dynamic(
  () =>
    import("@/components/chat/message-generated-artifacts").then(
      (module) => module.MessageGeneratedArtifacts
    ),
  { ssr: false }
);

const RollingAgentActivity = dynamic(
  () =>
    import("@/components/chat/rolling-tool-activity-body").then(
      (module) => module.RollingAgentActivity
    ),
  { ssr: false }
);

const RollingToolActivity = dynamic(
  () =>
    import("@/components/chat/rolling-tool-activity-body").then(
      (module) => module.RollingToolActivity
    ),
  { ssr: false }
);

const MessageRenderPartsWithNotes = dynamic(
  () =>
    import("@/components/chat/message-render-parts-with-notes").then(
      (module) => module.MessageRenderPartsWithNotes
    ),
  { ssr: false }
);

function MessagesError({
  error,
}: {
  error: NonNullable<MessagesProps["error"]>;
}) {
  return (
    <Card className="mx-auto mb-4 w-full max-w-3xl border-destructive/20 bg-destructive/8 text-destructive shadow-sm">
      <CardContent className="flex items-start gap-3 px-4 py-3 sm:items-center">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
        <div className="min-w-0">
          <p className="font-medium text-base leading-5">Message Error</p>
          <p className="mt-1 text-destructive/80 text-sm leading-5">
            {getChatErrorMessage(error)}
          </p>
          <p className="mt-1 text-destructive/75 text-xs leading-5">
            If the issue repeats, try again or contact support.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

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

export function PreviewMessageSurface({
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
  const parts = preferTransientParts(message.parts ?? []);
  const fileParts = parts.filter((part) => part.type === "file");
  const { agentActivityParts, remainingParts, rollingToolParts } =
    splitMessageParts(parts);
  const latestAgentActivity =
    agentActivity ?? (agentActivityParts.at(-1)?.data as AgentActivityData);
  const agentActions = toAgentActivityActions(latestAgentActivity);
  const visibleRollingToolParts =
    agentActions.length > 0
      ? rollingToolParts.filter(
          (part) => !TOOL_ACTIVITY_AGENT_TYPES.has(part.type)
        )
      : rollingToolParts;
  const renderBlocks = groupRenderableBlocks(remainingParts);
  const hasWidgetParts = renderBlocks.some(
    (block) => isToolPart(block.part) && block.part.type === "tool-show_widget"
  );

  return (
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className={cn("group/message mx-auto w-full max-w-3xl px-3 sm:px-4", {
          "justify-self-end": message.role === "user",
        })}
        data-message-id={message.id}
        data-role={message.role}
        data-testid={`message-${message.role}`}
        initial={{ opacity: 0, y: 5 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div
          className="flex w-full flex-col gap-3 group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-[82%]"
          style={
            message.role === "assistant" && isActiveReply && replyMinHeight
              ? { minHeight: replyMinHeight }
              : undefined
          }
        >
          {message.role === "assistant" ? (
            <div className="flex flex-row items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-[0.15em]">
              <span>Apollo</span>
            </div>
          ) : null}

          <div
            className={cn(
              "flex w-full flex-col gap-3",
              message.role === "user" && "items-end"
            )}
          >
            {agentActions.length > 0 ? (
              <RollingAgentActivity
                actions={agentActions}
                isStreaming={latestAgentActivity?.status === "running"}
              />
            ) : null}
            {visibleRollingToolParts.length > 0 ? (
              <RollingToolActivity
                isStreaming={isStreaming}
                key={`message-${message.id}-tool-activity`}
                parts={visibleRollingToolParts}
              />
            ) : null}
            <MessageAttachments
              fileParts={fileParts}
              messageId={message.id}
              workspaceUuid={workspaceUuid}
            />
            {hasWidgetParts ? (
              <MessageRenderPartsWithNotes
                allParts={parts}
                hideAgentToolTypes={agentActions.length > 0}
                isStreaming={isStreaming}
                message={message}
                renderBlocks={renderBlocks}
                sendMessage={sendMessage}
                workspaceUuid={workspaceUuid}
              />
            ) : (
              <MessageRenderParts
                allParts={parts}
                hideAgentToolTypes={agentActions.length > 0}
                isStreaming={isStreaming}
                message={message}
                openNoteInsertDialog={() => undefined}
                renderBlocks={renderBlocks}
                sendMessage={sendMessage}
                workspaceUuid={workspaceUuid}
              />
            )}
            {message.role === "assistant" ? (
              <MessageGeneratedArtifacts
                parts={visibleRollingToolParts}
                workspaceUuid={workspaceUuid}
              />
            ) : null}
          </div>

          {!isReadonly && message.role === "assistant" && isComplete ? (
            <ChatActions
              chatId={chatId}
              message={message}
              onRegenerate={onRegenerate}
            />
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  );
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

export function ChatMessagesSurface({
  props,
  runtime,
}: {
  props: MessagesProps;
  runtime: ReturnType<typeof useChatMessages>;
}) {
  const shouldVirtualizePastTurns = runtime.pastTurnMessages.length > 6;

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
        className="no-scrollbar relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-0 pt-28 pb-6 sm:pt-16"
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
                height: shouldVirtualizePastTurns
                  ? `${runtime.pastTurnsHeight}px`
                  : undefined,
              }}
            >
              {shouldVirtualizePastTurns ? (
                runtime.virtualItems.map((virtualItem) => {
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
                        isActiveReply={
                          message.id === props.activeReplyMessageId
                        }
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
                })
              ) : (
                <div className="flex flex-col gap-6 pb-6">
                  {runtime.pastTurnMessages.map((message) => {
                    const messageState = getAssistantMessageState(message, {
                      isStreaming: false,
                      status: props.status,
                    });

                    return (
                      <div data-message-id={message.id} key={message.id}>
                        <ChatMessageRow
                          agentActivity={null}
                          chatId={props.chatId}
                          isActiveReply={
                            message.id === props.activeReplyMessageId
                          }
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
              )}
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
