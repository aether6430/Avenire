"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import { widgetSpecSchema } from "@avenire/ai/tools";
import { Button, buttonVariants } from "@avenire/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@avenire/ui/components/dialog";
import { ArrowSquareOut, PlusCircle } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { type ComponentProps, memo, useEffect, useMemo, useState } from "react";
import type { Attachment } from "@/components/chat/attachment";
import { ChatActions } from "@/components/chat/chat-actions";
import { Markdown } from "@/components/chat/markdown";
import { PreviewAttachment } from "@/components/chat/preview-attachment";
import {
  type ActivityAction,
  isRollingToolPart,
  ReasoningAction,
  RollingAgentActivity,
  RollingToolActivity,
} from "@/components/chat/rolling-tool-activity";
import { ChatToolPart, ToolRow } from "@/components/chat/tool-part";
import { WidgetPrimitiveRenderer } from "@/components/WidgetPrimitiveRenderer";
import { WidgetRenderer } from "@/components/WidgetRenderer";
import { dispatchNoteWidgetInsertion } from "@/lib/note-widgets";
import { cn } from "@/lib/utils";
import { resolveWorkspaceFileRoute } from "@/lib/workspace-file-navigation";
import { useHeaderStore } from "@/stores/header-store";
import { useWorkspacePaneStore } from "@/stores/workspacePaneStore";

type MessagePart = UIMessage["parts"][number];
type ToolPart = Extract<MessagePart, { type: `tool-${string}` }>;
type AgentActivityPart = Extract<MessagePart, { type: "data-agent_activity" }>;
type CompletedToolPart = Extract<ToolPart, { state: "output-available" }>;
interface FlashcardToolOutput {
  cards?: unknown[];
  setId: string;
  title: string;
}
interface NoteToolOutput {
  notes?: Array<{
    fileId: string;
    title?: string;
    workspacePath: string;
  }>;
}
type NoteWidgetPayload = Parameters<typeof dispatchNoteWidgetInsertion>[0];
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

const isRenderableWidgetSpec = (
  value: unknown
): value is ComponentProps<typeof WidgetPrimitiveRenderer>["spec"] =>
  widgetSpecSchema.safeParse(normalizeWidgetSpec(value)).success;

function normalizeWidgetSpec(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) {
    return value;
  }

  const normalizeNode = (nodeValue: unknown): unknown => {
    const node = asRecord(nodeValue);
    if (!node) {
      return nodeValue;
    }

    const next: Record<string, unknown> = { ...node };
    if (next.type === "chart") {
      const xKey =
        typeof next.indexKey === "string"
          ? next.indexKey
          : typeof next.xKey === "string"
            ? next.xKey
            : typeof next.x === "string"
              ? next.x
              : typeof next.xColumn === "string"
                ? next.xColumn
                : undefined;
      const yKey =
        typeof next.yKey === "string"
          ? next.yKey
          : typeof next.y === "string"
            ? next.y
            : typeof next.yColumn === "string"
              ? next.yColumn
              : undefined;

      if (xKey && typeof next.indexKey !== "string") {
        next.indexKey = xKey;
      }
      if (!Array.isArray(next.series) && yKey) {
        next.series = [
          {
            dataKey: yKey,
            label: typeof next.yLabel === "string" ? next.yLabel : yKey,
          },
        ];
      }
    }

    if (Array.isArray(next.children)) {
      next.children = next.children.map(normalizeNode);
    }

    return next;
  };

  return {
    ...record,
    root: normalizeNode(record.root),
  };
}

function parseJsonPayload(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  const first = trimmed[0];
  if (first !== "{" && first !== "[") {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  const hydrated = parseJsonPayload(value);
  if (
    typeof hydrated === "object" &&
    hydrated !== null &&
    !Array.isArray(hydrated)
  ) {
    return hydrated as Record<string, unknown>;
  }

  return null;
}

function getNestedValue(value: unknown, path: string[]): unknown {
  let current: unknown = value;

  for (const key of path) {
    const record = asRecord(current);
    if (!record || !(key in record)) {
      return undefined;
    }
    current = record[key];
  }

  return parseJsonPayload(current);
}

function firstStringValue(...values: unknown[]) {
  for (const value of values) {
    const hydrated = parseJsonPayload(value);
    if (typeof hydrated === "string" && hydrated.trim().length > 0) {
      return hydrated;
    }
  }

  return null;
}

function firstWidgetSpec(
  ...values: unknown[]
): ComponentProps<typeof WidgetPrimitiveRenderer>["spec"] | null {
  for (const value of values) {
    const hydrated = parseJsonPayload(value);
    const normalized = normalizeWidgetSpec(hydrated);
    if (isRenderableWidgetSpec(normalized)) {
      return normalized;
    }
  }

  return null;
}

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

const isReasoningPartStreaming = (
  part: MessagePart,
  parts: MessagePart[],
  isStreaming: boolean
) => {
  if (!isStreaming) {
    return false;
  }

  return parts.indexOf(part) === parts.length - 1;
};

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

const TOOL_ACTIVITY_AGENT_TYPES = new Set([
  "tool-avenire_agent",
  "tool-file_manager_agent",
  // Granular file operations (handled by rolling activity)
  "tool-list_files",
  "tool-read_file",
  "tool-move_file",
  "tool-delete_file",
  "tool-create_folder",
  "tool-get_file_info",
  // Granular note operations (handled by rolling activity)
  "tool-create_note",
  "tool-read_note",
  "tool-update_note",
  "tool-list_notes",
  "tool-update_note_tags",
]);

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
        case "misconception":
          if (!action.value) {
            return null;
          }
          return {
            kind: "misconception",
            pending: action.pending,
            value: action.value,
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
            (part.type === "tool-note_agent" ||
              part.type === "tool-create_note" ||
              part.type === "tool-read_note" ||
              part.type === "tool-update_note") &&
            part.state === "output-available"
        )
        .flatMap((part) => {
          if (part.type === "tool-note_agent") {
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
          }
          const output = part.output as { fileId?: string; title?: string; workspacePath?: string };
          return output.fileId
            ? [
                {
                  fileId: output.fileId,
                  title: output.title ?? "",
                  workspacePath: output.workspacePath ?? "",
                },
              ]
            : [];
        }),
    [parts]
  );

  const [noteRoutes, setNoteRoutes] = useState<Record<string, string | null>>(
    {}
  );

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
  isActiveReply,
  isComplete,
  isStreaming,
  onRegenerate,
  replyMinHeight,
  sendMessage,
  isReadonly,
  workspaceUuid,
}: {
  agentActivity: AgentActivityData | null;
  chatId: string;
  message: UIMessage;
  isActiveReply?: boolean;
  isComplete: boolean;
  isStreaming: boolean;
  onRegenerate: (messageId: string) => void;
  replyMinHeight?: string;
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
  const visibleRollingToolParts =
    agentActions.length > 0
      ? rollingToolParts.filter(
          (part) => !TOOL_ACTIVITY_AGENT_TYPES.has(part.type)
        )
      : rollingToolParts;
  const renderBlocks = groupRenderableBlocks(remainingParts);
  const panes = useWorkspacePaneStore((state) => state.panes);
  const focusPane = useWorkspacePaneStore((state) => state.focusPane);
  const activePaneId = useWorkspacePaneStore((state) => state.activePaneId);
  const paneHeaders = useHeaderStore((state) => state.byPane);
  const [noteInsertDialogOpen, setNoteInsertDialogOpen] = useState(false);
  const [pendingNoteWidget, setPendingNoteWidget] =
    useState<NoteWidgetPayload | null>(null);
  const noteTargets = useMemo(
    () =>
      panes
        .filter((pane) => pane.route.pathname.startsWith("/workspace/files"))
        .sort((left, right) => {
          if (left.id === activePaneId) {
            return -1;
          }
          if (right.id === activePaneId) {
            return 1;
          }
          return left.id.localeCompare(right.id);
        })
        .map((pane) => {
          const title = paneHeaders[pane.id]?.title?.trim();
          const routeLabel = pane.route.pathname.replace(
            "/workspace/files/",
            ""
          );
          return {
            id: pane.id,
            label: title || routeLabel || "Files pane",
            route: `${pane.route.pathname}${pane.route.search}`,
          };
        }),
    [activePaneId, paneHeaders, panes]
  );

  const openNoteInsertDialog = (payload: NoteWidgetPayload) => {
    setPendingNoteWidget(payload);
    setNoteInsertDialogOpen(true);
  };

  const insertIntoNoteTarget = (paneId: string) => {
    if (!pendingNoteWidget) {
      return;
    }

    focusPane(paneId);
    const payload = pendingNoteWidget;
    setPendingNoteWidget(null);
    setNoteInsertDialogOpen(false);
    window.requestAnimationFrame(() => {
      dispatchNoteWidgetInsertion(payload);
    });
  };

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
                    isStreaming={isReasoningPartStreaming(
                      part,
                      parts,
                      isStreaming
                    )}
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
                const input = asRecord(part.input);
                const output = asRecord(part.output);
                const inputWidget = asRecord(input?.widget);
                const outputWidget = asRecord(output?.widget);
                const widgetCode =
                  firstStringValue(
                    getNestedValue(outputWidget, ["code"]),
                    getNestedValue(inputWidget, ["code"]),
                    getNestedValue(output, ["widget_code"]),
                    getNestedValue(input, ["widget_code"]),
                    getNestedValue(output, ["widget", "widget_code"]),
                    getNestedValue(input, ["widget", "widget_code"])
                  ) ?? "";

                const widgetSpec = firstWidgetSpec(
                  getNestedValue(outputWidget, ["spec"]),
                  getNestedValue(inputWidget, ["spec"]),
                  getNestedValue(output, ["widget_spec"]),
                  getNestedValue(input, ["widget_spec"]),
                  getNestedValue(output, ["widget_schema"]),
                  getNestedValue(input, ["widget_schema"]),
                  getNestedValue(output, ["widget", "widget_spec"]),
                  getNestedValue(input, ["widget", "widget_spec"]),
                  getNestedValue(output, ["widget", "widget_schema"]),
                  getNestedValue(input, ["widget", "widget_schema"])
                );
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
                const loadingMessage =
                  output?.success === false
                    ? "Widget unavailable."
                    : (loadingMessages.at(0) ?? "loading...");
                const isStreamingWidget = part.state === "input-streaming";
                const runScripts = !isStreamingWidget;

                return (
                  <div className="mb-2 space-y-2" key={key}>
                    <ToolRow label="Widget">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-foreground/28">
                          {title ?? "interactive"}
                        </span>
                        {widgetCode && !isStreamingWidget ? (
                          <Button
                            className="h-7 rounded-full px-3 text-[11px]"
                            onClick={() => {
                              openNoteInsertDialog({
                                html: widgetCode,
                                title,
                              });
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <PlusCircle className="mr-1 size-3.5" />
                            Add to note
                          </Button>
                        ) : null}
                      </div>
                    </ToolRow>
                    {widgetSpec ? (
                      <WidgetPrimitiveRenderer spec={widgetSpec} />
                    ) : widgetCode ? (
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
        <Dialog
          onOpenChange={(open) => {
            setNoteInsertDialogOpen(open);
            if (!open) {
              setPendingNoteWidget(null);
            }
          }}
          open={noteInsertDialogOpen}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add to note</DialogTitle>
              <DialogDescription>
                Choose which open note pane should receive this widget.
              </DialogDescription>
            </DialogHeader>
            <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
              {noteTargets.length > 0 ? (
                noteTargets.map((target) => (
                  <Button
                    className="justify-start gap-3"
                    key={target.id}
                    onClick={() => insertIntoNoteTarget(target.id)}
                    type="button"
                    variant={target.id === activePaneId ? "default" : "outline"}
                  >
                    <span className="min-w-0 flex-1 truncate text-left">
                      {target.label}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {target.id === activePaneId ? "Active" : "Open"}
                    </span>
                  </Button>
                ))
              ) : (
                <div className="rounded-lg border border-border/60 border-dashed px-4 py-5 text-muted-foreground text-sm">
                  Open a file pane first, then try adding the widget again.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
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
    prev.isActiveReply === next.isActiveReply &&
    prev.isComplete === next.isComplete &&
    prev.replyMinHeight === next.replyMinHeight &&
    prev.workspaceUuid === next.workspaceUuid
  );
});
