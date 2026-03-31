"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import { buttonVariants } from "@avenire/ui/components/button";
import { AnimatePresence, motion } from "motion/react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { memo, useEffect, useMemo, useState } from "react";
import type { Attachment } from "@/components/chat/attachment";
import { ChatActions } from "@/components/chat/chat-actions";
import { Markdown } from "@/components/chat/markdown";
import { PreviewAttachment } from "@/components/chat/preview-attachment";
import {
  type ActivityAction,
  isRollingToolPart,
  RollingAgentActivity,
  ReasoningAction,
  RollingToolActivity,
} from "@/components/chat/rolling-tool-activity";
import { ChatToolPart, ToolRow } from "@/components/chat/tool-part";
import { WidgetRenderer } from "@/components/WidgetRenderer";
import { resolveWorkspaceFileRoute } from "@/lib/workspace-file-navigation";
import { cn } from "@/lib/utils";

type MessagePart = UIMessage["parts"][number];
type ToolPart = Extract<MessagePart, { type: `tool-${string}` }>;
type AgentActivityPart = Extract<MessagePart, { type: "data-agent_activity" }>;
type CompletedToolPart = Extract<ToolPart, { state: "output-available" }>;
type FlashcardToolOutput = {
  cards?: Array<unknown>;
  setId: string;
  title: string;
};
type NoteToolOutput = {
  notes?: Array<{
    fileId: string;
    title?: string;
    workspacePath: string;
  }>;
};
interface RenderBlock {
  index: number;
  part: MessagePart;
  type: "part";
}

const isReasoningPart = (part: MessagePart) =>
  part.type === "reasoning" ||
  part.type.startsWith("reasoning-") ||
  ("reasoning" in part &&
    typeof part.reasoning === "string" &&
    part.reasoning.length > 0) ||
  ("reasoningText" in part &&
    typeof part.reasoningText === "string" &&
    part.reasoningText.length > 0);

const getReasoningText = (part: MessagePart) => {
  const candidates = [
    "text" in part ? part.text : undefined,
    "reasoning" in part ? part.reasoning : undefined,
    "reasoningText" in part ? part.reasoningText : undefined,
    "content" in part ? part.content : undefined,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return "";
};

const isToolPart = (part: MessagePart): part is ToolPart =>
  part.type.startsWith("tool-");

function isTransientPart(part: MessagePart) {
  return "transient" in part && part.transient === true;
}

function getPartIdentity(part: MessagePart) {
  if (isReasoningPart(part)) {
    return "reasoning";
  }

  if (isToolPart(part)) {
    const toolCallId =
      "toolCallId" in part && typeof part.toolCallId === "string"
        ? part.toolCallId
        : null;
    return toolCallId ? `${part.type}:${toolCallId}` : part.type;
  }

  return null;
}

function preferTransientParts(parts: MessagePart[]) {
  const transientKeys = new Set(
    parts.filter(isTransientPart).map(getPartIdentity).filter(Boolean)
  );

  return parts.filter((part) => {
    const identity = getPartIdentity(part);
    if (!identity) {
      return true;
    }
    if (isTransientPart(part)) {
      return true;
    }
    return !transientKeys.has(identity);
  });
}

const groupRenderableBlocks = (parts: MessagePart[]): RenderBlock[] =>
  parts.map((part, index) => ({ index, part, type: "part" }));

const splitMessageParts = (parts: MessagePart[]) => {
  const rollingToolParts: ToolPart[] = [];
  const agentActivityParts: AgentActivityPart[] = [];
  const remainingParts: MessagePart[] = [];

  for (const part of parts) {
    if (isToolPart(part) && isRollingToolPart(part)) {
      rollingToolParts.push(part);
      continue;
    }
    if (part.type === "data-agent_activity") {
      agentActivityParts.push(part);
      continue;
    }
    remainingParts.push(part);
  }

  return { agentActivityParts, remainingParts, rollingToolParts };
};

const toAgentActivityActions = (
  activity: AgentActivityData | undefined
): ActivityAction[] => {
  if (!activity) {
    return [];
  }

  return activity.actions
    .map<ActivityAction | null>((action) => {
      switch (action.kind) {
        case "edit":
          if (!action.path) {
            return null;
          }
          return {
            kind: "edit",
            path: action.path,
            pending: action.pending,
          };
        case "list":
          if (!action.value) {
            return null;
          }
          return {
            kind: "list",
            pending: action.pending,
            value: action.value,
          };
        case "read":
          if (!action.value) {
            return null;
          }
          return {
            kind: "read",
            pending: action.pending,
            value: action.value,
            preview: action.preview?.content
              ? {
                  content: action.preview.content,
                  path: action.preview.path ?? action.value,
                }
              : undefined,
          };
        case "search":
          if (!action.value) {
            return null;
          }
          return {
            kind: "search",
            pending: action.pending,
            value: action.value,
            preview: action.preview?.query
              ? {
                  query: action.preview.query,
                  matches: action.preview.matches ?? [],
                }
              : undefined,
          };
        default:
          return null;
      }
    })
    .filter((item): item is ActivityAction => item !== null);
};

function AnimatedMarkdown({
  content,
  id,
  workspaceUuid,
}: {
  content: string;
  id: string;
  workspaceUuid: string;
}) {
  return <Markdown content={content} id={id} workspaceUuid={workspaceUuid} />;
}

function GeneratedArtifacts({
  parts,
  workspaceUuid,
}: {
  parts: ToolPart[];
  workspaceUuid: string;
}) {
  const generatedFlashcards = useMemo(
    () =>
      parts
        .filter(
          (part): part is CompletedToolPart =>
            part.type === "tool-generate_flashcards" &&
            part.state === "output-available"
        )
        .map((part) => {
          const output = part.output as FlashcardToolOutput;
          return {
            cardCount: Array.isArray(output.cards) ? output.cards.length : 0,
            setId: output.setId,
            title: output.title,
          };
        })
        .filter((item) => item.cardCount > 0),
    [parts]
  );

  const generatedNotes = useMemo(
    () =>
      parts
        .filter(
          (part): part is CompletedToolPart =>
            part.type === "tool-note_agent" && part.state === "output-available"
        )
        .flatMap((part) => {
          const output = part.output as NoteToolOutput;
          return Array.isArray(output.notes)
            ? output.notes
                .map((note) => ({
                  fileId: note.fileId,
                  title: note.title,
                  workspacePath: note.workspacePath,
                }))
                .filter((note) => typeof note.fileId === "string")
            : [];
        }),
    [parts]
  );

  const [noteRoutes, setNoteRoutes] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;

    const missingRoutes = generatedNotes.filter(
      (note) => noteRoutes[note.fileId] === undefined
    );
    if (missingRoutes.length === 0 || !workspaceUuid) {
      return;
    }

    for (const note of missingRoutes) {
      void resolveWorkspaceFileRoute(workspaceUuid, note.fileId)
        .then((route) => {
          if (cancelled) {
            return;
          }
          setNoteRoutes((current) => ({
            ...current,
            [note.fileId]: route,
          }));
        })
        .catch(() => {
          if (cancelled) {
            return;
          }
          setNoteRoutes((current) => ({
            ...current,
            [note.fileId]: null,
          }));
        });
    }

    return () => {
      cancelled = true;
    };
  }, [generatedNotes, noteRoutes, workspaceUuid]);

  if (generatedNotes.length === 0 && generatedFlashcards.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {generatedFlashcards.map((deck) => (
        <a
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "gap-1.5"
          )}
          href={`/workspace/flashcards/${deck.setId}`}
          key={deck.setId}
        >
          <span>Open flashcards</span>
          <span className="max-w-[18rem] truncate text-foreground/70">
            {deck.title}
          </span>
          <span className="text-foreground/40">({deck.cardCount})</span>
          <ArrowSquareOut className="size-3.5" />
        </a>
      ))}
      {generatedNotes.map((note) => {
        const route = noteRoutes[note.fileId];
        if (!route) {
          return null;
        }

        return (
          <a
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "gap-1.5"
            )}
            href={route}
            key={note.fileId}
          >
            <span>Open note</span>
            <span className="max-w-[18rem] truncate text-foreground/70">
              {note.title ?? note.workspacePath}
            </span>
            <ArrowSquareOut className="size-3.5" />
          </a>
        );
      })}
    </div>
  );
}

const toAttachment = (part: MessagePart): Partial<Attachment> | null => {
  if (part.type !== "file" || !part.url) {
    return null;
  }
  return {
    name: part.filename ?? "Attachment",
    url: part.url,
    contentType: part.mediaType ?? "application/octet-stream",
    status: "completed",
  };
};

const PurePreviewMessage = ({
  agentActivity,
  chatId,
  message,
  isComplete,
  isStreaming,
  onRegenerate,
  sendMessage,
  isReadonly,
  workspaceUuid,
}: {
  agentActivity: AgentActivityData | null;
  chatId: string;
  message: UIMessage;
  isComplete: boolean;
  isStreaming: boolean;
  onRegenerate: (messageId: string) => void;
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  isReadonly: boolean;
  workspaceUuid: string;
}) => {
  const parts = preferTransientParts(message.parts ?? []);
  const fileParts = parts.filter((part) => part.type === "file");
  const { agentActivityParts, remainingParts, rollingToolParts } =
    splitMessageParts(parts);
  const latestAgentActivity =
    agentActivity ?? (agentActivityParts.at(-1)?.data as AgentActivityData);
  const agentActions = toAgentActivityActions(latestAgentActivity);
  const renderBlocks = groupRenderableBlocks(remainingParts);

  return (
    <AnimatePresence>
      <motion.div
        animate={{ y: 0, opacity: 1 }}
        className={cn("group/message mx-auto w-full max-w-3xl px-4", {
          "justify-self-end": message.role === "user",
        })}
        data-role={message.role}
        data-testid={`message-${message.role}`}
        initial={{ y: 5, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="flex w-full flex-col gap-3 group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-[80%]">
          {message.role === "assistant" && (
            <div className="flex flex-row items-center gap-2">
              <div className="flex flex-col gap-4 text-muted-foreground text-[11px] uppercase tracking-[0.15em]">
                Apollo
              </div>
            </div>
          )}

          <div
            className={cn(
              "flex w-full flex-col gap-4",
              message.role === "user" && "items-end"
            )}
          >
            {agentActions.length > 0 && (
              <RollingAgentActivity
                actions={agentActions}
                isStreaming={latestAgentActivity?.status === "running"}
              />
            )}
            {rollingToolParts.length > 0 && (
              <RollingToolActivity
                isStreaming={isStreaming}
                key={`message-${message.id}-tool-activity`}
                parts={rollingToolParts}
              />
            )}
            {fileParts.length > 0 && (
              <div
                className="flex flex-row justify-end gap-2"
                data-testid="message-attachments"
              >
                {fileParts.map((part, index) => {
                  const attachment = toAttachment(part);
                  if (!attachment) {
                    return null;
                  }
                  return (
                    <PreviewAttachment
                      attachment={attachment}
                      key={`${message.id}-file-${index}`}
                      workspaceUuid={workspaceUuid}
                    />
                  );
                })}
              </div>
            )}

            {renderBlocks.map((block) => {
              const key = `message-${message.id}-part-${block.index}`;
              const { part } = block;

              if (isReasoningPart(part)) {
                return (
                  <ReasoningAction
                    content={getReasoningText(part)}
                    isStreaming={isStreaming}
                    key={key}
                    workspaceUuid={workspaceUuid}
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
                          "group relative rounded-lg bg-secondary px-4 py-3 text-secondary-foreground"
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
                const input = (part as { input?: Record<string, unknown> })
                  .input;
                const output = (part as { output?: Record<string, unknown> })
                  .output;
                const widgetCode =
                  typeof input?.widget_code === "string"
                    ? input.widget_code
                    : typeof output?.widget_code === "string"
                      ? output.widget_code
                    : "";
                const title =
                  typeof input?.title === "string"
                    ? input.title
                    : typeof output?.details === "object" &&
                        output.details !== null &&
                        typeof (output.details as { title?: unknown }).title ===
                          "string"
                      ? (output.details as { title: string }).title
                      : null;
                const loadingMessages = Array.isArray(input?.loading_messages)
                  ? input?.loading_messages.filter(
                      (message) => typeof message === "string"
                    )
                  : [];
                const loadingMessage = loadingMessages.at(0) ?? "loading...";
                const isStreamingWidget = part.state === "input-streaming";
                const runScripts = !isStreamingWidget;

                return (
                  <div className="mb-2 space-y-2" key={key}>
                    <ToolRow label="Widget">
                      <span className="font-mono text-[11px] text-foreground/28">
                        {title ?? "interactive"}
                      </span>
                    </ToolRow>
                    {widgetCode ? (
                      <WidgetRenderer
                        html={widgetCode}
                        isStreaming={isStreamingWidget}
                        onOpenLink={(url) => {
                          window.open(url, "_blank");
                        }}
                        onSendMessage={(text) => {
                          sendMessage({ text });
                        }}
                        runScripts={runScripts}
                      />
                    ) : (
                      <span className="font-mono text-[11px] text-foreground/28">
                        {loadingMessage}
                      </span>
                    )}
                  </div>
                );
              }

              if (isToolPart(part)) {
                if (
                  (part.type === "tool-avenire_agent" ||
                    part.type === "tool-file_manager_agent") &&
                  agentActions.length > 0
                ) {
                  return null;
                }
                return <ChatToolPart key={key} part={part} />;
              }
              return null;
            })}

            {message.role === "assistant" ? (
              <GeneratedArtifacts
                parts={rollingToolParts}
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
};

export const PreviewMessage = memo(PurePreviewMessage, (prev, next) => {
  if (prev.isStreaming || next.isStreaming) {
    return false;
  }
  if (prev.agentActivity || next.agentActivity) {
    return false;
  }

  const prevParts = prev.message.parts ?? [];
  const nextParts = next.message.parts ?? [];
  const prevLast = prevParts.at(-1);
  const nextLast = nextParts.at(-1);
  const prevSignature = [
    prev.message.id,
    prev.message.role,
    prevParts.length,
    prevLast?.type ?? "",
    prevLast && "text" in prevLast ? (prevLast.text ?? "") : "",
    prevLast && "state" in prevLast ? (prevLast.state ?? "") : "",
  ].join("|");
  const nextSignature = [
    next.message.id,
    next.message.role,
    nextParts.length,
    nextLast?.type ?? "",
    nextLast && "text" in nextLast ? (nextLast.text ?? "") : "",
    nextLast && "state" in nextLast ? (nextLast.state ?? "") : "",
  ].join("|");

  return (
    prevSignature === nextSignature &&
    prev.isComplete === next.isComplete &&
    prev.workspaceUuid === next.workspaceUuid
  );
});
