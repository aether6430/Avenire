"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import {
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
import { cn } from "@/lib/utils";

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
    import("@/components/chat/rolling-tool-activity-surface").then(
      (module) => module.RollingAgentActivity
    ),
  { ssr: false }
);

const RollingToolActivity = dynamic(
  () =>
    import("@/components/chat/rolling-tool-activity-surface").then(
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
}: {
  agentActivity: AgentActivityData | null;
  chatId: string;
  isActiveReply?: boolean;
  isComplete: boolean;
  isReadonly: boolean;
  isStreaming: boolean;
  message: UIMessage;
  onRegenerate: (messageId: string) => void;
  replyMinHeight?: string;
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  workspaceUuid: string;
}) {
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
        animate={{ y: 0, opacity: 1 }}
        className={cn("group/message mx-auto w-full max-w-3xl px-3 sm:px-4", {
          "justify-self-end": message.role === "user",
        })}
        data-message-id={message.id}
        data-role={message.role}
        data-testid={`message-${message.role}`}
        initial={{ y: 5, opacity: 0 }}
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
          {message.role === "assistant" && (
            <div className="flex flex-row items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-[0.15em]">
              <span>Apollo</span>
            </div>
          )}

          <div
            className={cn(
              "flex w-full flex-col gap-3",
              message.role === "user" && "items-end"
            )}
          >
            {agentActions.length > 0 && (
              <RollingAgentActivity
                actions={agentActions}
                isStreaming={latestAgentActivity?.status === "running"}
              />
            )}
            {visibleRollingToolParts.length > 0 && (
              <RollingToolActivity
                isStreaming={isStreaming}
                key={`message-${message.id}-tool-activity`}
                parts={visibleRollingToolParts}
              />
            )}
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

          {!isReadonly && message.role === "assistant" && isComplete && (
            <ChatActions
              chatId={chatId}
              message={message}
              onRegenerate={
                message.role === "assistant" ? onRegenerate : undefined
              }
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
