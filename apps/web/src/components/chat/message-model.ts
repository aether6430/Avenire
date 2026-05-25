import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import type { WidgetSpec } from "@avenire/ai/tools";
import type { Attachment } from "@/components/chat/attachment";
import type { ActivityAction } from "@/components/chat/rolling-tool-activity-types";
import { isRollingToolPart } from "@/components/chat/rolling-tool-activity-types";

export type MessagePart = UIMessage["parts"][number];
export type ToolPart = Extract<MessagePart, { type: `tool-${string}` }>;
export type AgentActivityPart = Extract<
  MessagePart,
  { type: "data-agent_activity" }
>;
export type CompletedToolPart = Extract<
  ToolPart,
  { state: "output-available" }
>;

export interface FlashcardToolOutput {
  cards?: unknown[];
  setId: string;
  title: string;
}

export interface NoteToolOutput {
  notes?: Array<{
    fileId: string;
    title?: string;
    workspacePath: string;
  }>;
}

export interface MessageWidgetInsertionPayload {
  html: string;
  title: string | null;
}

export interface RenderBlock {
  index: number;
  part: MessagePart;
  type: "part";
}

export const TOOL_ACTIVITY_AGENT_TYPES = new Set([
  "tool-avenire_agent",
  "tool-file_manager_agent",
]);

export const isReasoningPart = (part: MessagePart) =>
  part.type === "reasoning" ||
  part.type.startsWith("reasoning-") ||
  ("reasoning" in part &&
    typeof part.reasoning === "string" &&
    part.reasoning.length > 0) ||
  ("reasoningText" in part &&
    typeof part.reasoningText === "string" &&
    part.reasoningText.length > 0);

export const getReasoningText = (part: MessagePart) => {
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

export const isRenderableWidgetSpec = (value: unknown): value is WidgetSpec =>
  typeof value === "object" &&
  value !== null &&
  "title" in value &&
  typeof value.title === "string" &&
  "root" in value &&
  typeof value.root === "object" &&
  value.root !== null;

export const isToolPart = (part: MessagePart): part is ToolPart =>
  part.type.startsWith("tool-");

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

export function isTransientPart(part: MessagePart) {
  return "transient" in part && part.transient === true;
}

export function getPartIdentity(part: MessagePart) {
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

export function preferTransientParts(parts: MessagePart[]) {
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

export const groupRenderableBlocks = (parts: MessagePart[]): RenderBlock[] =>
  parts.map((part, index) => ({ index, part, type: "part" }));

export const isReasoningPartStreaming = (
  part: MessagePart,
  parts: MessagePart[],
  isStreaming: boolean
) => {
  if (!isStreaming) {
    return false;
  }

  return parts.indexOf(part) === parts.length - 1;
};

export const splitMessageParts = (parts: MessagePart[]) => {
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

export const toAgentActivityActions = (
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

export const toAttachment = (part: MessagePart): Partial<Attachment> | null => {
  if (part.type !== "file" || !part.url) {
    return null;
  }

  return {
    contentType: part.mediaType ?? "application/octet-stream",
    name: part.filename ?? "Attachment",
    status: "completed",
    url: part.url,
  };
};

export interface PreviewMessageComparisonInput {
  agentActivity: AgentActivityData | null;
  isActiveReply?: boolean;
  isComplete: boolean;
  isStreaming: boolean;
  message: UIMessage;
  replyMinHeight?: string;
  workspaceUuid: string;
}

export function arePreviewMessagesEqual(
  prev: PreviewMessageComparisonInput,
  next: PreviewMessageComparisonInput
) {
  if (prev.isStreaming || next.isStreaming) {
    return false;
  }
  if (prev.agentActivity || next.agentActivity) {
    return false;
  }

  return (
    getMessageSignature(prev.message) === getMessageSignature(next.message) &&
    prev.isActiveReply === next.isActiveReply &&
    prev.isComplete === next.isComplete &&
    prev.replyMinHeight === next.replyMinHeight &&
    prev.workspaceUuid === next.workspaceUuid
  );
}
