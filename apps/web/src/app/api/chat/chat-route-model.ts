import type { PromptMemoryBlock } from "@avenire/ai";
import type { UIMessage } from "@avenire/ai/message-types";
import { normalizeMediaType } from "@/lib/media-type";

export const DEFAULT_CHAT_TITLE = "New Method";
const DEFAULT_CHAT_TOKENS_PER_CREDIT = 4000;
const WHITESPACE_PATTERN = /\s+/g;
export const DEFAULT_THINKING_MESSAGES = [
  "Thinking through the details",
  "Checking the shape of the answer",
  "Putting the pieces together",
  "Finishing the last pass",
];
const MODEL_TOOL_ALLOW_LIST = new Set([
  "avenire_agent",
  "file_manager_agent",
  "note_agent",
  "generate_flashcards",
  "generate_flashcards_from_misconception",
  "get_due_cards",
  "list_misconceptions",
  "log_misconception",
  "quiz_me",
  "web_search",
  "search_materials",
  "visualize_read_me",
  "load_skill",
  "show_widget",
]);

export function sanitizeChatName(value: string) {
  return value
    .replace(/^["'`\s]+|["'`\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function fallbackChatNameFromText(value: string) {
  const normalized = sanitizeChatName(
    value.split(WHITESPACE_PATTERN).slice(0, 6).join(" ")
  );

  return normalized.length > 0 ? normalized : DEFAULT_CHAT_TITLE;
}

export function stripNonHttpFileParts(messages: UIMessage[]) {
  let changed = false;

  const nextMessages = messages.map((message) => {
    const nextParts = message.parts.flatMap((part): typeof message.parts => {
      if (part.type !== "file") {
        return [part];
      }

      const url =
        typeof (part as { url?: unknown }).url === "string"
          ? ((part as { url: string }).url ?? "").trim()
          : "";

      if (url.startsWith("http://") || url.startsWith("https://")) {
        return [part];
      }

      changed = true;
      return [];
    });

    if (!changed) {
      return message;
    }

    return {
      ...message,
      parts: nextParts,
    };
  });

  return changed ? nextMessages : messages;
}

export function extractLatestUserText(messages: UIMessage[]) {
  const latestUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  if (!latestUserMessage) {
    return "";
  }

  if (latestUserMessage.parts) {
    const textPart = latestUserMessage.parts.find(
      (part) => part.type === "text"
    );
    return textPart?.type === "text" ? textPart.text.trim() : "";
  }
  const content =
    typeof (latestUserMessage as { content?: unknown }).content === "string"
      ? ((latestUserMessage as { content?: string }).content ?? "").trim()
      : "";
  if (content) {
    return content;
  }

  const text =
    typeof (latestUserMessage as { text?: unknown }).text === "string"
      ? ((latestUserMessage as { text?: string }).text ?? "").trim()
      : "";
  return text;
}

function buildDetectedSubjectContext(subject: string | null) {
  if (!subject) {
    return null;
  }

  return [
    `Detected session subject: ${subject}.`,
    "Treat this as soft context, not a hard constraint.",
  ].join(" ");
}

export function buildPromptMemoryBlocks(input: {
  misconceptionsContext: string | null;
  sessionSummaryContext: string | null;
  studentProfileContext: string | null;
  subject: string | null;
  topic: string | null;
}): PromptMemoryBlock[] {
  const blocks: PromptMemoryBlock[] = [];

  if (input.subject) {
    blocks.push({
      content:
        buildDetectedSubjectContext(input.subject) ??
        `Detected session subject: ${input.subject}.`,
      freshness: "current",
      kind: "subject",
      scope: {
        subject: input.subject,
        topic: input.topic,
      },
    });
  }

  if (input.sessionSummaryContext) {
    blocks.push({
      content: input.sessionSummaryContext,
      freshness: "recent",
      kind: "session-summary",
      scope: {
        subject: input.subject,
        topic: input.topic,
      },
    });
  }

  if (input.studentProfileContext) {
    blocks.push({
      content: input.studentProfileContext,
      freshness: "historical",
      kind: "student-profile",
      scope: {
        subject: input.subject,
        topic: input.topic,
      },
    });
  }

  if (input.misconceptionsContext) {
    blocks.push({
      content: input.misconceptionsContext,
      freshness: "historical",
      kind: "misconception",
      scope: {
        subject: input.subject,
        topic: input.topic,
      },
    });
  }

  return blocks;
}

export function isPromptMemoryBlockArray(
  value: unknown
): value is PromptMemoryBlock[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof (entry as { content?: unknown }).content === "string" &&
        typeof (entry as { kind?: unknown }).kind === "string"
    )
  );
}

export function extractMessageText(message: UIMessage) {
  if (message.parts) {
    return message.parts
      .filter(
        (part): part is Extract<typeof part, { type: "text" }> =>
          part.type === "text"
      )
      .map((part) => part.text)
      .join("\n")
      .trim();
  }
  return "";
}

export function resolveChatContextMaxChars() {
  const parsed = Number.parseInt(process.env.CHAT_CONTEXT_MAX_CHARS ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 2000) {
    return 24_000;
  }
  return parsed;
}

export function trimMessagesForModelContext(messages: UIMessage[]) {
  const maxChars = resolveChatContextMaxChars();
  if (messages.length <= 2) {
    return messages;
  }

  const out: UIMessage[] = [];
  let totalChars = 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message) {
      continue;
    }
    const textLength = extractMessageText(message).length;
    const nextTotal = totalChars + textLength;
    if (out.length > 0 && nextTotal > maxChars) {
      break;
    }
    out.push(message);
    totalChars = nextTotal;
  }

  return out.reverse();
}

export function pickModelTools<T extends Record<string, unknown>>(
  tools: T,
  excludedToolNames: Iterable<string> = []
) {
  const excluded = new Set(
    Array.from(excludedToolNames, (name) => name.trim()).filter(Boolean)
  );
  return Object.fromEntries(
    Object.entries(tools).filter(
      ([name]) => MODEL_TOOL_ALLOW_LIST.has(name) && !excluded.has(name)
    )
  ) as T;
}

export function modelUsesLegacyWidgetSchema(model: string) {
  return model === "apollo-apex";
}

export function normalizeMessageFileMediaTypes(messages: UIMessage[]) {
  let changed = false;

  const normalizedMessages = messages.map((message) => {
    let messageChanged = false;

    const normalizedParts = message.parts.map((part) => {
      if (part.type !== "file") {
        return part;
      }

      const normalizedPartMediaType = normalizeMediaType(part.mediaType);
      if (normalizedPartMediaType === part.mediaType) {
        return part;
      }

      changed = true;
      messageChanged = true;

      return {
        ...part,
        mediaType: normalizedPartMediaType,
      };
    });

    if (!messageChanged) {
      return message;
    }

    return {
      ...message,
      parts: normalizedParts,
    };
  });

  return changed ? normalizedMessages : messages;
}

export function shouldGenerateTitle(
  currentTitle: string,
  messages: UIMessage[]
) {
  if (currentTitle === DEFAULT_CHAT_TITLE) {
    return true;
  }

  const latestUserText = extractLatestUserText(messages);
  if (!latestUserText) {
    return false;
  }

  return currentTitle === sanitizeChatName(latestUserText);
}

function resolveChatTokensPerCredit() {
  const raw = Number.parseInt(process.env.CHAT_TOKENS_PER_CREDIT ?? "", 10);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_CHAT_TOKENS_PER_CREDIT;
  }
  return raw;
}

export function resolveTotalTokens(usage: {
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
}) {
  if (
    typeof usage.totalTokens === "number" &&
    Number.isFinite(usage.totalTokens)
  ) {
    return usage.totalTokens;
  }

  const inputTokens =
    typeof usage.inputTokens === "number" ? usage.inputTokens : 0;
  const outputTokens =
    typeof usage.outputTokens === "number" ? usage.outputTokens : 0;
  return inputTokens + outputTokens;
}

export function getRequiredChatCredits(totalTokens: number) {
  const tokensPerCredit = resolveChatTokensPerCredit();
  return Math.max(1, Math.ceil(totalTokens / tokensPerCredit));
}

export function getPersistedMessages(input: {
  originalMessages: UIMessage[];
  streamedMessages: UIMessage[];
  responseMessage: UIMessage;
  isContinuation: boolean;
}) {
  let persisted: UIMessage[];
  if (input.streamedMessages.length >= input.originalMessages.length) {
    persisted = input.streamedMessages;
  } else if (input.isContinuation && input.originalMessages.length > 0) {
    persisted = [...input.originalMessages.slice(0, -1), input.responseMessage];
  } else {
    persisted = [...input.originalMessages, input.responseMessage];
  }

  const latestUserMessage = [...input.originalMessages]
    .reverse()
    .find((message) => message.role === "user");
  if (!latestUserMessage) {
    return persisted;
  }
  if (persisted.some((message) => message.id === latestUserMessage.id)) {
    return persisted;
  }

  const responseIndex = persisted.findIndex(
    (message) => message.id === input.responseMessage.id
  );
  if (responseIndex < 0) {
    return [...persisted, latestUserMessage];
  }

  return [
    ...persisted.slice(0, responseIndex),
    latestUserMessage,
    ...persisted.slice(responseIndex),
  ];
}
