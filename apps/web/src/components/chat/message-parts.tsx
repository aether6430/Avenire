"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "@avenire/ai/message-types";
import dynamic from "next/dynamic";
import type { MarkdownRenderProps } from "@/components/chat/markdown-model";
import type {
  MessagePart,
  MessageWidgetInsertionPayload,
  RenderBlock,
} from "@/components/chat/message-model";
import {
  getReasoningText,
  isReasoningPart,
  isReasoningPartStreaming,
  isToolPart,
  TOOL_ACTIVITY_AGENT_TYPES,
  toAttachment,
} from "@/components/chat/message-model";
import { ChatToolPart } from "@/components/chat/tool-part";
import { cn } from "@/lib/utils";

const PreviewAttachmentLazy = dynamic(
  () =>
    import("@/components/chat/preview-attachment").then(
      (module) => module.PreviewAttachment
    ),
  { ssr: false }
);

const MessageWidgetPart = dynamic(
  () =>
    import("@/components/chat/message-widget-part").then(
      (module) => module.MessageWidgetPart
    ),
  { ssr: false }
);

const MarkdownLazy = dynamic<MarkdownRenderProps>(
  () =>
    import("@/components/chat/markdown-surface").then(
      (module) => module.MemoizedMarkdownSurface
    ),
  {
    loading: () => null,
    ssr: false,
  }
);

const ReasoningAction = dynamic(
  () =>
    import("@/components/chat/rolling-reasoning-action").then(
      (module) => module.ReasoningAction
    ),
  { ssr: false }
);

function AnimatedMarkdown({
  content,
  id,
  workspaceUuid,
}: {
  content: string;
  id: string;
  workspaceUuid: string;
}) {
  return (
    <MarkdownLazy content={content} key={id} workspaceUuid={workspaceUuid} />
  );
}

export function MessageAttachments({
  fileParts,
  messageId,
  workspaceUuid,
}: {
  fileParts: MessagePart[];
  messageId: string;
  workspaceUuid: string;
}) {
  if (fileParts.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-row justify-end gap-2"
      data-testid="message-attachments"
    >
      {fileParts.map((part) => {
        const attachment = toAttachment(part);
        if (!attachment) {
          return null;
        }

        return (
          <PreviewAttachmentLazy
            attachment={attachment}
            key={`${messageId}-file-${attachment.id}`}
            workspaceUuid={workspaceUuid}
          />
        );
      })}
    </div>
  );
}

export function MessageRenderParts({
  allParts,
  hideAgentToolTypes,
  isStreaming,
  message,
  openNoteInsertDialog,
  renderBlocks,
  sendMessage,
  workspaceUuid,
}: {
  allParts: MessagePart[];
  hideAgentToolTypes: boolean;
  isStreaming: boolean;
  message: UIMessage;
  openNoteInsertDialog: (payload: MessageWidgetInsertionPayload) => void;
  renderBlocks: RenderBlock[];
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  workspaceUuid: string;
}) {
  return (
    <>
      {renderBlocks.map((block) => {
        const key = `message-${message.id}-part-${block.index}`;
        const { part } = block;

        if (isReasoningPart(part)) {
          return (
            <ReasoningAction
              content={getReasoningText(part)}
              isStreaming={isReasoningPartStreaming(
                part,
                allParts,
                isStreaming
              )}
              key={key}
            />
          );
        }

        if (part.type === "text") {
          return (
            <div className="flex flex-row items-start gap-2" key={key}>
              <div
                className={cn(
                  "flex w-full flex-col gap-4",
                  message.role === "user" &&
                    "group relative rounded-[22px] rounded-br-[10px] border border-border/60 bg-secondary px-4 py-3 text-secondary-foreground",
                  message.role === "assistant" && "px-0 py-0"
                )}
                data-testid="message-content"
              >
                {message.role === "user" ? (
                  <p className="text-sm leading-6 sm:text-[15px]">
                    {part.text ?? ""}
                  </p>
                ) : (
                  <AnimatedMarkdown
                    content={part.text ?? ""}
                    id={key}
                    workspaceUuid={workspaceUuid}
                  />
                )}
              </div>
            </div>
          );
        }

        if (isToolPart(part) && part.type === "tool-show_widget") {
          return (
            <MessageWidgetPart
              key={key}
              openNoteInsertDialog={openNoteInsertDialog}
              part={part}
              sendMessage={sendMessage}
            />
          );
        }

        if (isToolPart(part)) {
          if (hideAgentToolTypes && TOOL_ACTIVITY_AGENT_TYPES.has(part.type)) {
            return null;
          }
          return <ChatToolPart key={key} part={part} />;
        }

        return null;
      })}
    </>
  );
}

export type MessageRenderPartsProps = Parameters<typeof MessageRenderParts>[0];
