import { createHash, randomUUID } from "node:crypto";
import {
  APOLLO_LANGUAGE_MODEL_IDS,
  APOLLO_PROMPT,
  type ApolloModelName,
  apollo,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  type PromptMemoryBlock,
  smoothStream,
  stepCountIs,
  streamText,
} from "@avenire/ai";
import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { after, NextResponse } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { consumeChatUnits, restoreChatUnits } from "@/lib/billing";
import {
  createChatForUser,
  deleteChatForUser,
  getChatBySlugForUser,
  getMessagesByChatSlugForUser,
  getWritableChatBySlugForUser,
  saveMessagesForChatSlug,
  updateChatForUser,
} from "@/lib/chat-data";
import {
  CHAT_ICON_NAMES,
  DEFAULT_CHAT_ICON,
  isChatIconName,
} from "@/lib/chat-icons";
import {
  createChatTools,
  getActiveMisconceptionContext,
} from "@/lib/chat-tools";
import { invalidateChatReadCaches } from "@/lib/domain-cache";
import { resolveWorkspaceForUser } from "@/lib/file-data";
import "@/lib/learning-automation";
import {
  getLatestSessionSummaryForChat,
  getRecentRelevantSessionSummary,
} from "@avenire/database";
import { normalizeMediaType } from "@/lib/media-type";
import { detectMisconceptionSignals } from "@/lib/misconception-signal-detector";
import { createApiLogger } from "@/lib/observability";
import {
  buildRecentSessionSummaryContext,
  getWorkspaceSubjectSummary,
  persistSessionSummaryForCompletedTurn,
} from "@/lib/session-summaries";
import { buildStudentProfileContext } from "@/lib/student-profile";
import {
  inferTopicLabel,
  normalizeSubjectLabel,
} from "@/lib/subject-detection";
import {
  clearActiveStreamId,
  getActiveStreamId,
  getRedisClient,
  getRedisSubscriber,
  setActiveStreamId,
} from "./chat-stream-store";

const DEFAULT_CHAT_TITLE = "New Chat";
const LOG_PREFIX = "[api/chat]";
const DEFAULT_CHAT_TOKENS_PER_CREDIT = 1000;
const DEFAULT_EXPECTED_OUTPUT_TOKENS = 2000;
const DEFAULT_WIDGET_GENERATION_CREDITS = 20;
const DEFAULT_TURBO_MODEL_CREDIT_MULTIPLIER = 2;
const DEFAULT_CHAT_TITLE_MODEL: ApolloModelName = "apollo-meta";
const LEARNING_CONTEXT_CACHE_PREFIX = "chat-learning-context:v1:";
const LEARNING_CONTEXT_CACHE_TTL_SECONDS = 60 * 60 * 3;
const CHAT_STARTUP_CONTEXT_TIMEOUT_MS = 1200;
const MISCONCEPTION_SIGNAL_TIMEOUT_MS = 900;
const WHITESPACE_PATTERN = /\s+/g;
const DEFAULT_THINKING_MESSAGES = [
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
  "quiz_me",
  "web_search",
  "search_materials",
  "visualize_read_me",
  "load_skill",
  "show_widget",
]);
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isChatProfileLoggingEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.CHAT_PROFILE_LOGS?.trim().toLowerCase() === "true"
  );
}

function getProfileLogMeta() {
  if (!isChatProfileLoggingEnabled()) {
    return null;
  }

  return {
    profileAt: new Date().toISOString(),
    profileEpochMs: Date.now(),
    profileProcessMs: Math.round(performance.now() * 1000) / 1000,
  };
}

function withProfileLogMeta(meta?: Record<string, unknown>) {
  const profileMeta = getProfileLogMeta();
  if (!profileMeta) {
    return meta;
  }

  return {
    ...meta,
    ...profileMeta,
  };
}

function logInfo(message: string, meta?: Record<string, unknown>) {
  const nextMeta = withProfileLogMeta(meta);
  if (nextMeta) {
    console.info(`${LOG_PREFIX} ${message}`, nextMeta);
    return;
  }

  console.info(`${LOG_PREFIX} ${message}`);
}

function logError(message: string, meta?: Record<string, unknown>) {
  const nextMeta = withProfileLogMeta(meta);
  if (nextMeta) {
    console.error(`${LOG_PREFIX} ${message}`, nextMeta);
    return;
  }

  console.error(`${LOG_PREFIX} ${message}`);
}

function logWarn(message: string, meta?: Record<string, unknown>) {
  const nextMeta = withProfileLogMeta(meta);
  if (nextMeta) {
    console.warn(`${LOG_PREFIX} ${message}`, nextMeta);
    return;
  }

  console.warn(`${LOG_PREFIX} ${message}`);
}

async function withStartupTimeout<T>(
  promise: Promise<T>,
  label: string,
  fallback: T,
  timeoutMs = CHAT_STARTUP_CONTEXT_TIMEOUT_MS
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => {
          logWarn("Startup context timed out; continuing without it", {
            label,
            timeoutMs,
          });
          resolve(fallback);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    const maybeApiError = error as Error & {
      statusCode?: unknown;
      url?: unknown;
      responseBody?: unknown;
      lastError?: unknown;
      reason?: unknown;
    };
    return {
      name: error.name,
      message: error.message,
      reason: maybeApiError.reason,
      statusCode: maybeApiError.statusCode,
      url: maybeApiError.url,
      responseBody: maybeApiError.responseBody,
      lastError: maybeApiError.lastError
        ? formatError(maybeApiError.lastError)
        : undefined,
      stack: error.stack,
    };
  }
  return { message: "Unknown error", value: error };
}

function getChatStreamErrorMessage(error: unknown) {
  const formatted = formatError(error);
  logError("Model stream failed", { error: formatted });

  if (isAbortLikeError(error)) {
    return "The chat request was stopped.";
  }

  return "The model provider failed while generating this response. Please retry in a moment.";
}

function isAbortLikeError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "AbortError" ||
    error.name === "ResponseAborted" ||
    error.message.toLowerCase().includes("aborted")
  );
}

function sanitizeChatName(value: string) {
  return value
    .replace(/^["'`\s]+|["'`\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function fallbackChatNameFromText(value: string) {
  const normalized = sanitizeChatName(
    value.split(WHITESPACE_PATTERN).slice(0, 6).join(" ")
  );

  return normalized.length > 0 ? normalized : DEFAULT_CHAT_TITLE;
}

const SESSION_CLOSE_KEY_PREFIX = "chat:session-close:";
const SESSION_CLOSE_TTL_SECONDS = 60 * 60 * 24;
const memoryLearningContextCache = new Map<
  string,
  { expiresAtMs: number; value: PromptMemoryBlock[] }
>();

function buildSessionCloseKey(input: {
  chatId: string;
  sessionId: string;
  userId: string;
  workspaceId: string;
}) {
  return [
    SESSION_CLOSE_KEY_PREFIX,
    input.userId,
    input.workspaceId,
    input.chatId,
    input.sessionId,
  ].join("");
}

async function markSessionCloseSeen(key: string) {
  try {
    const client = await getRedisClient();
    const result = await client.set(key, "1", {
      EX: SESSION_CLOSE_TTL_SECONDS,
      NX: true,
    });
    return result === "OK";
  } catch {
    return true;
  }
}

function resolveChatTitleModel(): ApolloModelName {
  const raw = process.env.CHAT_TITLE_MODEL?.trim();
  if (!raw) {
    return DEFAULT_CHAT_TITLE_MODEL;
  }

  const allowed = new Set<ApolloModelName>([
    "apollo-sprint",
    "apollo-core",
    "apollo-apex",
    "apex-turbo",
    "apollo-agent",
    "apollo-meta",
    "apollo-tiny",
  ]);

  if (allowed.has(raw as ApolloModelName)) {
    if (
      (raw === "apollo-sprint" || raw === "apollo-tiny") &&
      !process.env.MISTRAL_API_KEY?.trim()
    ) {
      return DEFAULT_CHAT_TITLE_MODEL;
    }
    return raw as ApolloModelName;
  }

  return DEFAULT_CHAT_TITLE_MODEL;
}

function stripNonHttpFileParts(messages: UIMessage[]) {
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

function extractLatestUserText(messages: UIMessage[]) {
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

function buildPromptMemoryBlocks(input: {
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

function isPromptMemoryBlockArray(
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

function buildLearningContextCacheKey(input: {
  recentSummaryUpdatedAt?: string | null;
  subject: string | null;
  topic: string | null;
  userId: string;
  workspaceId: string;
}) {
  return [
    LEARNING_CONTEXT_CACHE_PREFIX,
    input.userId,
    input.workspaceId,
    input.subject ?? "none",
    input.topic ?? "none",
    input.recentSummaryUpdatedAt ?? "none",
  ].join(":");
}

async function readLearningContextCache(key: string) {
  const memoryCached = memoryLearningContextCache.get(key);
  if (memoryCached && memoryCached.expiresAtMs > Date.now()) {
    return memoryCached.value;
  }
  if (memoryCached) {
    memoryLearningContextCache.delete(key);
  }

  try {
    const client = await getRedisClient();
    const raw = await client.get(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isPromptMemoryBlockArray(parsed)) {
      return null;
    }
    memoryLearningContextCache.set(key, {
      expiresAtMs: Date.now() + LEARNING_CONTEXT_CACHE_TTL_SECONDS * 1000,
      value: parsed,
    });
    return parsed;
  } catch {
    return null;
  }
}

async function writeLearningContextCache(
  key: string,
  value: PromptMemoryBlock[]
) {
  memoryLearningContextCache.set(key, {
    expiresAtMs: Date.now() + LEARNING_CONTEXT_CACHE_TTL_SECONDS * 1000,
    value,
  });

  try {
    const client = await getRedisClient();
    await client.set(key, JSON.stringify(value), {
      EX: LEARNING_CONTEXT_CACHE_TTL_SECONDS,
    });
  } catch {
    // Redis is optional in local/dev runs; the process cache still avoids repeat work.
  }
}

async function getCachedLearningPromptMemoryBlocks(input: {
  recentSummaryContext: string | null;
  recentSummaryUpdatedAt?: string | null;
  subject: string | null;
  topic: string | null;
  userId: string;
  workspaceId: string;
}) {
  const key = buildLearningContextCacheKey(input);
  const cached = await readLearningContextCache(key);
  if (cached) {
    return cached;
  }

  const [activeMisconceptionContext, studentProfileContext] = await Promise.all(
    [
      getActiveMisconceptionContext({
        subject: input.subject,
        topic: input.topic,
        userId: input.userId,
        workspaceId: input.workspaceId,
      }),
      buildStudentProfileContext({
        subject: input.subject,
        topic: input.topic,
        userId: input.userId,
        workspaceId: input.workspaceId,
      }),
    ]
  );

  const blocks = buildPromptMemoryBlocks({
    misconceptionsContext: activeMisconceptionContext,
    sessionSummaryContext: input.recentSummaryContext,
    studentProfileContext,
    subject: input.subject,
    topic: input.topic,
  });
  await writeLearningContextCache(key, blocks);
  return blocks;
}

async function generateChatMetadata(
  latestUserText: string,
  abortSignal?: AbortSignal
) {
  if (!latestUserText) {
    logInfo("Skipping chat title generation: latest user text missing");
    return null;
  }

  try {
    const modelName = resolveChatTitleModel();
    logInfo("Generating chat title", {
      model: apollo.languageModel(modelName),
      sourceLength: latestUserText.length,
    });

    const { text } = await generateText({
      model: apollo.languageModel(modelName),
      prompt: [
        "Generate a concise, descriptive chat title and a single icon choice based only on the user's request.",
        "Use 4-8 words when possible.",
        "Avoid generic labels and single-word replies.",
        "No quotes. No punctuation at the end.",
        "Pick ONE icon from this list (exact string match):",
        CHAT_ICON_NAMES.join(", "),
        "Return ONLY valid JSON with this shape:",
        '{"title":"...","icon":"..."}',
        `User message: ${latestUserText}`,
      ].join("\n"),
      maxOutputTokens: 64,
      temperature: 0.2,
      abortSignal,
    });

    if (!text || text.trim().length === 0) {
      const fallback = fallbackChatNameFromText(latestUserText);
      logInfo("Generated chat title result", {
        raw: text ?? "",
        normalized: "",
        accepted: false,
        fallback,
      });
      return { title: fallback, icon: DEFAULT_CHAT_ICON };
    }

    let parsedTitle: string | null = null;
    let parsedIcon: string | null = null;
    const trimmed = text.trim();
    const jsonStart = trimmed.indexOf("{");
    const jsonEnd = trimmed.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const candidate = trimmed.slice(jsonStart, jsonEnd + 1);
      try {
        const parsed = JSON.parse(candidate) as {
          title?: string;
          icon?: string;
        };
        parsedTitle = typeof parsed.title === "string" ? parsed.title : null;
        parsedIcon = typeof parsed.icon === "string" ? parsed.icon : null;
      } catch {
        parsedTitle = null;
        parsedIcon = null;
      }
    }

    const normalized = parsedTitle ? sanitizeChatName(parsedTitle) : "";
    const fallback = fallbackChatNameFromText(latestUserText);
    const accepted =
      normalized.length > 0 &&
      (normalized.length >= 8 ||
        latestUserText.trim().length <= normalized.length + 4);
    logInfo("Generated chat title result", {
      raw: text,
      normalized,
      accepted,
      fallback,
    });

    if (accepted) {
      const icon = isChatIconName(parsedIcon) ? parsedIcon : DEFAULT_CHAT_ICON;
      return { title: normalized, icon };
    }

    return { title: fallback, icon: DEFAULT_CHAT_ICON };
  } catch (error) {
    if (abortSignal?.aborted || isAbortLikeError(error)) {
      return null;
    }
    logError("Failed to generate chat title", { error });
    return {
      title: fallbackChatNameFromText(latestUserText),
      icon: DEFAULT_CHAT_ICON,
    };
  }
}

async function generateChatThinkingMessages(
  latestUserText: string,
  abortSignal?: AbortSignal
) {
  if (!(latestUserText && !abortSignal?.aborted)) {
    return null;
  }

  return DEFAULT_THINKING_MESSAGES;
}

function extractMessageText(message: UIMessage) {
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

function resolveChatContextMaxChars() {
  const parsed = Number.parseInt(process.env.CHAT_CONTEXT_MAX_CHARS ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 2000) {
    return 24_000;
  }
  return parsed;
}

function trimMessagesForModelContext(messages: UIMessage[]) {
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

function pickModelTools<T extends Record<string, unknown>>(
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

function modelUsesLegacyWidgetSchema(model: ApolloModelName) {
  return model === "apollo-apex" || model === "apex-turbo";
}

function normalizeMessageFileMediaTypes(messages: UIMessage[]) {
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

function buildChatIdempotencyRedisKey(input: {
  userId: string;
  workspaceId: string;
  chatSlug: string;
  idempotencyKey: string;
}) {
  const hash = createHash("sha256")
    .update(
      `${input.userId}:${input.workspaceId}:${input.chatSlug}:${input.idempotencyKey}`
    )
    .digest("hex");
  return `chat:idempotency:${hash}`;
}

async function tryAcquireIdempotencyLock(key: string) {
  try {
    const client = await getRedisClient();
    const ok = await client.set(
      key,
      JSON.stringify({ status: "in_progress", ts: Date.now() }),
      {
        EX: 180,
        NX: true,
      }
    );
    return ok === "OK";
  } catch {
    return true;
  }
}

async function getIdempotencyState(key: string) {
  try {
    const client = await getRedisClient();
    return await client.get(key);
  } catch {
    return null;
  }
}

async function markIdempotencyDone(key: string, chatSlug: string) {
  try {
    const client = await getRedisClient();
    await client.set(
      key,
      JSON.stringify({ status: "done", chatSlug, ts: Date.now() }),
      {
        EX: 600,
      }
    );
  } catch {
    // ignore idempotency mark failures
  }
}

async function clearIdempotencyKey(key: string) {
  try {
    const client = await getRedisClient();
    await client.del(key);
  } catch {
    // ignore idempotency cleanup failures
  }
}

function shouldGenerateTitle(currentTitle: string, messages: UIMessage[]) {
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

function resolveWidgetGenerationCredits() {
  const raw = Number.parseInt(process.env.WIDGET_GENERATION_CREDITS ?? "", 10);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_WIDGET_GENERATION_CREDITS;
  }
  return raw;
}

function resolveTurboModelCreditMultiplier() {
  const raw = Number.parseFloat(
    process.env.TURBO_MODEL_CREDIT_MULTIPLIER ?? ""
  );
  if (!Number.isFinite(raw) || raw < 1) {
    return DEFAULT_TURBO_MODEL_CREDIT_MULTIPLIER;
  }
  return raw;
}

function modelUsesTurboCreditMultiplier(model: ApolloModelName) {
  return model === "apex-turbo";
}

function getModelCreditMultiplier(model: ApolloModelName) {
  return modelUsesTurboCreditMultiplier(model)
    ? resolveTurboModelCreditMultiplier()
    : 1;
}

function resolveTotalTokens(usage: {
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

function getRequiredChatCredits(totalTokens: number, model: ApolloModelName) {
  const tokensPerCredit = resolveChatTokensPerCredit();
  const baseCredits = Math.max(1, Math.ceil(totalTokens / tokensPerCredit));
  return Math.ceil(baseCredits * getModelCreditMultiplier(model));
}

function estimateMessageTokens(messages: UIMessage[]) {
  const textChars = messages.reduce(
    (total, message) => total + extractMessageText(message).length,
    0
  );
  return Math.ceil(textChars / 4);
}

function getExpectedChatCredits(messages: UIMessage[], model: ApolloModelName) {
  return getRequiredChatCredits(
    estimateMessageTokens(messages) + DEFAULT_EXPECTED_OUTPUT_TOKENS,
    model
  );
}

function getRefundedChatUsage(
  usage: {
    consumedFromFourHour: number;
    consumedFromOverage: number;
  },
  units: number
) {
  let remaining = Math.max(0, Math.floor(units));
  const overage = Math.min(usage.consumedFromOverage, remaining);
  remaining -= overage;
  const fourHour = Math.min(usage.consumedFromFourHour, remaining);

  return {
    consumedFromFourHour: fourHour,
    consumedFromOverage: overage,
  };
}

function getPersistedMessages(input: {
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

  // Ensure the most recently sent user message is always persisted.
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

export async function POST(request: Request) {
  const requestHeadersPromise = headers();
  const requestBodyPromise = request.json().catch(() => ({}));
  const session = await auth.api.getSession({
    headers: await requestHeadersPromise,
  });
  const apiLogger = createApiLogger({
    request,
    route: "/api/chat",
    feature: "chat",
    userId: session?.user?.id ?? null,
  });
  apiLogger.requestStarted();
  let idempotencyRedisKey: string | null = null;
  let idempotencyLockAcquired = false;

  try {
    if (!session?.user) {
      apiLogger.requestFailed(401, "Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId =
      (session as { session?: { activeOrganizationId?: string | null } })
        .session?.activeOrganizationId ?? null;
    const workspace = await resolveWorkspaceForUser(
      session.user.id,
      activeOrganizationId
    );
    if (!workspace) {
      apiLogger.requestFailed(404, "Workspace not found");
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const body = (await requestBodyPromise) as {
      kind?: "session-close";
      messages?: UIMessage[];
      workspaceUuid?: string;
      selectedModel?: ApolloModelName;
      chatId?: string;
      sessionId?: string;
      status?: string;
      userName?: string;
    };

    if (body.kind === "session-close") {
      const chatId = body.chatId?.trim() ?? "";
      const sessionId = body.sessionId?.trim() ?? "";
      if (!chatId || chatId === "new" || !sessionId) {
        apiLogger.requestSucceeded(202, {
          chatId: chatId || null,
          kind: "session-close",
          ignored: true,
        });
        return NextResponse.json({ ok: true, ignored: true }, { status: 202 });
      }

      const dedupeKey = buildSessionCloseKey({
        chatId,
        sessionId,
        userId: session.user.id,
        workspaceId: workspace.workspaceId,
      });
      const shouldProcess = await markSessionCloseSeen(dedupeKey);
      if (!shouldProcess) {
        apiLogger.requestSucceeded(202, {
          chatId,
          kind: "session-close",
          deduped: true,
        });
        return NextResponse.json({ ok: true, deduped: true }, { status: 202 });
      }

      const chat = await getChatBySlugForUser(
        session.user.id,
        chatId,
        workspace.workspaceId
      );
      if (!chat) {
        apiLogger.requestFailed(404, "Chat not found", { chatId });
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      }

      const messages = await getMessagesByChatSlugForUser(
        session.user.id,
        chatId,
        workspace.workspaceId
      );
      if (!messages || messages.length === 0) {
        apiLogger.requestSucceeded(202, {
          chatId,
          kind: "session-close",
          ignored: true,
        });
        return NextResponse.json({ ok: true, ignored: true }, { status: 202 });
      }

      const latestSummary = await getLatestSessionSummaryForChat(chat.id).catch(
        (error) => {
          logWarn(
            "Failed to load latest session summary; continuing without it",
            {
              chatId,
              error: formatError(error),
            }
          );
          return null;
        }
      );
      const latestUserPosition = Math.max(
        0,
        messages
          .map((message, index) => (message.role === "user" ? index : -1))
          .reduce((highest, index) => Math.max(highest, index), -1)
      );

      apiLogger.requestSucceeded(202, {
        chatId,
        kind: "session-close",
        messageCount: messages.length,
      });

      after(async () => {
        try {
          await persistSessionSummaryForCompletedTurn({
            chatId: chat.id,
            endedAt: new Date(),
            latestSummary,
            latestUserPosition,
            messages,
            previousLastMessageAt: chat.lastMessageAt
              ? new Date(chat.lastMessageAt)
              : null,
            requestStartedAt: new Date(),
            forceNewSessionBoundary: true,
            userId: session.user.id,
            workspaceId: workspace.workspaceId,
          });
        } catch (error) {
          logError("Failed to persist session summary on session close", {
            chatId,
            error,
          });
        }
      });

      return NextResponse.json({ ok: true }, { status: 202 });
    }

    const chatSlug: string = body.chatId?.trim() ?? "";
    if (!chatSlug) {
      apiLogger.requestFailed(400, "Missing chatId");
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }
    const idempotencyHeader = request.headers.get("idempotency-key")?.trim();

    const originalMessages = stripNonHttpFileParts(
      normalizeMessageFileMediaTypes(body.messages ?? [])
    );
    const modelContextMessages = trimMessagesForModelContext(originalMessages);

    type ExistingChat = NonNullable<
      Awaited<ReturnType<typeof getChatBySlugForUser>>
    >;
    type CreatedChat = Awaited<ReturnType<typeof createChatForUser>>;
    let chat: ExistingChat | CreatedChat | null = null;
    const shouldCreateChat =
      originalMessages.some((message) => message.role === "user") &&
      chatSlug !== "new";
    if (chatSlug === "new") {
      apiLogger.requestFailed(400, "Missing concrete chat id", {
        chatId: chatSlug,
      });
      return NextResponse.json(
        { error: "Missing concrete chat id" },
        { status: 400 }
      );
    }

    const idempotencyCheckPromise = idempotencyHeader
      ? (async () => {
          const key = buildChatIdempotencyRedisKey({
            userId: session.user.id,
            workspaceId: workspace.workspaceId,
            chatSlug,
            idempotencyKey: idempotencyHeader,
          });
          const state = await getIdempotencyState(key);
          if (state) {
            return { key, status: "duplicate" as const };
          }
          const acquired = await tryAcquireIdempotencyLock(key);
          return {
            key,
            status: acquired ? ("acquired" as const) : ("locked" as const),
          };
        })()
      : Promise.resolve(null);

    const [chatLookup, idempotencyCheck] = await Promise.all([
      getWritableChatBySlugForUser(
        session.user.id,
        chatSlug,
        workspace.workspaceId
      ),
      idempotencyCheckPromise,
    ]);
    chat = chatLookup;

    if (idempotencyCheck) {
      idempotencyRedisKey = idempotencyCheck.key;
      idempotencyLockAcquired = idempotencyCheck.status === "acquired";

      if (idempotencyCheck.status === "duplicate") {
        apiLogger.requestFailed(409, "Duplicate request", {
          chatId: chatSlug,
          idempotencyKey: idempotencyHeader,
        });
        return NextResponse.json(
          {
            error: "Duplicate request",
            chatId: chatSlug,
          },
          { status: 409 }
        );
      }

      if (idempotencyCheck.status === "locked") {
        apiLogger.requestFailed(409, "Request in progress", {
          chatId: chatSlug,
          idempotencyKey: idempotencyHeader,
        });
        return NextResponse.json(
          {
            error: "Request already in progress",
            chatId: chatSlug,
          },
          { status: 409 }
        );
      }
    }

    if (!chat && shouldCreateChat) {
      const createdChat = await createChatForUser(
        session.user.id,
        workspace.workspaceId,
        DEFAULT_CHAT_TITLE,
        chatSlug
      );
      after(async () => {
        await invalidateChatReadCaches(workspace.workspaceId);
      });
      chat = createdChat;
    }

    if (!chat) {
      apiLogger.requestFailed(404, "Chat not found", {
        chatId: chatSlug,
      });
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    if (chat.readOnly) {
      apiLogger.requestFailed(403, "Read-only chat", {
        chatId: chatSlug,
      });
      return NextResponse.json({ error: "Read-only chat" }, { status: 403 });
    }
    const requestStartedAt = new Date();

    const latestUserText = extractLatestUserText(originalMessages);
    const selectedModel = body.selectedModel ?? "apollo-apex";
    logInfo("Incoming chat request", {
      chatId: body.chatId ?? null,
      selectedModel,
      creditMultiplier: getModelCreditMultiplier(selectedModel),
      messageCount: originalMessages.length,
      modelContextCount: modelContextMessages.length,
    });
    const expectedCredits = getExpectedChatCredits(
      originalMessages,
      selectedModel
    );
    const initialUsage = await consumeChatUnits(
      session.user.id,
      expectedCredits
    );
    if (!initialUsage.ok) {
      const retryAfter = initialUsage.retryAfter?.toISOString() ?? null;
      apiLogger.rateLimited("chat", retryAfter, { chatId: chatSlug });
      if (idempotencyRedisKey && idempotencyLockAcquired) {
        await clearIdempotencyKey(idempotencyRedisKey);
      }
      return NextResponse.json(
        {
          error: "Chat usage limit reached",
          retryAfter,
        },
        { status: 429 }
      );
    }

    if (originalMessages.length > 0) {
      try {
        await saveMessagesForChatSlug(
          session.user.id,
          chatSlug,
          originalMessages,
          workspace.workspaceId
        );
        after(async () => {
          await invalidateChatReadCaches(workspace.workspaceId);
        });
        logInfo("Persisted user messages before stream", {
          chatId: chatSlug,
          messageCount: originalMessages.length,
        });
      } catch (error) {
        logError("Failed to persist user messages before stream", {
          chatId: chatSlug,
          error,
        });
        if (idempotencyRedisKey && idempotencyLockAcquired) {
          await clearIdempotencyKey(idempotencyRedisKey);
        }
        apiLogger.requestFailed(500, "Failed to save user messages", {
          chatId: chatSlug,
        });
        return NextResponse.json(
          { error: "Failed to save user messages" },
          { status: 500 }
        );
      }
    }

    const streamId = randomUUID();
    const previousStreamIdPromise = getActiveStreamId(chatSlug);
    await setActiveStreamId(chatSlug, streamId);
    const previousStreamId = await previousStreamIdPromise;
    if (previousStreamId) {
      await clearActiveStreamId(chatSlug, previousStreamId);
    }
    request.signal.addEventListener(
      "abort",
      () => {
        void clearActiveStreamId(chatSlug, streamId);
        logInfo("Chat request aborted", { chatId: chatSlug, streamId });
        if (idempotencyRedisKey && idempotencyLockAcquired) {
          void clearIdempotencyKey(idempotencyRedisKey);
        }
      },
      { once: true }
    );

    const stream = createUIMessageStream<UIMessage>({
      execute: async ({ writer }) => {
        const shouldGenerateChatTitle = shouldGenerateTitle(
          chat.title,
          originalMessages
        );
        const latestUserTextForMetadata =
          extractLatestUserText(originalMessages);
        const thinkingMessagesPromise = generateChatThinkingMessages(
          latestUserTextForMetadata,
          request.signal
        );
        const streamChatMetadata = async () => {
          if (!shouldGenerateChatTitle) {
            return;
          }

          try {
            const nextMeta = await generateChatMetadata(
              latestUserTextForMetadata,
              request.signal
            );
            if (!nextMeta?.title) {
              return;
            }

            logInfo("Streaming generated chat title event", {
              chatId: chatSlug,
              nameLength: nextMeta.title.length,
            });
            writer.write({
              type: "data-chatName",
              transient: true,
              data: {
                id: chatSlug,
                name: nextMeta.title,
                icon: nextMeta.icon,
              },
            });

            await updateChatForUser(
              session.user.id,
              chatSlug,
              {
                title: nextMeta.title,
                icon: nextMeta.icon,
              },
              workspace.workspaceId
            );
            await invalidateChatReadCaches(workspace.workspaceId);
            logInfo("Persisted generated chat title", {
              chatId: chatSlug,
              name: nextMeta.title,
            });
          } catch (error) {
            logWarn("Failed to stream generated chat title", {
              chatId: chatSlug,
              error: formatError(error),
            });
          }
        };

        writer.write({
          type: "data-thinkingMessages",
          transient: true,
          data: {
            id: chatSlug,
            messages: DEFAULT_THINKING_MESSAGES,
          },
        });

        void (async () => {
          try {
            const nextThinkingMessages = await thinkingMessagesPromise;
            if (!nextThinkingMessages?.length) {
              return;
            }

            writer.write({
              type: "data-thinkingMessages",
              transient: true,
              data: {
                id: chatSlug,
                messages: nextThinkingMessages,
              },
            });
          } catch (error) {
            logWarn("Failed to stream thinking messages", {
              chatId: chatSlug,
              error: formatError(error),
            });
          }
        })();

        logInfo("Starting model stream", {
          chatId: chatSlug,
          model: selectedModel,
          creditMultiplier: getModelCreditMultiplier(selectedModel),
          providerModel: APOLLO_LANGUAGE_MODEL_IDS[selectedModel],
        });

        let result: Awaited<ReturnType<typeof streamText>>;
        const agentActivityId = randomUUID();
        const misconceptionActivityId = randomUUID();
        const emitAgentActivity = (data: AgentActivityData) => {
          writer.write({
            type: "data-agent_activity",
            id: data.id,
            data,
            transient: true,
          });
        };
        const emitStartupActivity = (value: string) => {
          emitAgentActivity({
            id: agentActivityId,
            status: "running",
            actions: [
              {
                kind: "read",
                pending: true,
                value,
              },
            ],
          });
        };
        const emitMisconceptionActivity = (value: string) => {
          emitAgentActivity({
            id: misconceptionActivityId,
            status: "running",
            actions: [
              {
                kind: "misconception",
                pending: true,
                value,
              },
            ],
          });
        };
        const clearMisconceptionActivity = () => {
          emitAgentActivity({
            id: misconceptionActivityId,
            status: "done",
            actions: [],
          });
        };
        emitStartupActivity("Preparing chat context");
        const tools = createChatTools(
          {
            chatSlug,
            chargeWidgetGeneration: async () => {
              const widgetGenerationCredits = resolveWidgetGenerationCredits();
              const usage = await consumeChatUnits(
                session.user.id,
                widgetGenerationCredits
              );
              if (!usage.ok) {
                logInfo("Widget generation over usage limit", {
                  chatId: chatSlug,
                  credits: widgetGenerationCredits,
                  retryAfter: usage.retryAfter?.toISOString() ?? null,
                });
                throw new Error("Chat usage limit reached");
              }
              apiLogger.meter("meter.chat.widget", {
                chatId: chatSlug,
                creditsCharged: widgetGenerationCredits,
                model: selectedModel,
              });
            },
            agentActivityId,
            emitAgentActivity,
            rootFolderId: workspace.rootFolderId,
            userId: session.user.id,
            workspaceId: workspace.workspaceId,
          },
          {
            legacyShowWidgetSchema: modelUsesLegacyWidgetSchema(selectedModel),
          }
        );
        const modelTools = pickModelTools(tools);

        try {
          const workspaceSubjectSummaryPromise = withStartupTimeout(
            getWorkspaceSubjectSummary({
              userId: session.user.id,
              workspaceId: workspace.workspaceId,
            }).catch((error) => {
              logWarn(
                "Failed to load workspace subject summary; continuing without it",
                {
                  chatId: chat.id,
                  error: formatError(error),
                }
              );
              return null;
            }),
            "workspace-subject-summary",
            null
          );
          const modelMessagesPromise = convertToModelMessages(
            modelContextMessages,
            {
              tools,
            }
          );
          const workspaceSubjectSummary = await workspaceSubjectSummaryPromise;
          const resolvedSubject = normalizeSubjectLabel(
            workspaceSubjectSummary?.subject ?? null
          );
          const recentRelevantSummaryPromise = resolvedSubject
            ? withStartupTimeout(
                getRecentRelevantSessionSummary({
                  subject: resolvedSubject,
                  userId: session.user.id,
                  workspaceId: workspace.workspaceId,
                }).catch((error) => {
                  logWarn(
                    "Failed to load recent relevant session summary; continuing without it",
                    {
                      chatId: chat.id,
                      error: formatError(error),
                      subject: resolvedSubject,
                    }
                  );
                  return null;
                }),
                "recent-relevant-session-summary",
                null
              )
            : Promise.resolve(null);
          const recentRelevantSummary = await recentRelevantSummaryPromise;
          const resolvedTopic = inferTopicLabel(
            [latestUserText, recentRelevantSummary?.summaryText]
              .filter(
                (value) => typeof value === "string" && value.trim().length > 0
              )
              .join("\n\n"),
            resolvedSubject
          );
          const promptMemoryBlocksPromise = withStartupTimeout(
            getCachedLearningPromptMemoryBlocks({
              recentSummaryContext: buildRecentSessionSummaryContext(
                recentRelevantSummary
              ),
              recentSummaryUpdatedAt: recentRelevantSummary?.updatedAt ?? null,
              subject: resolvedSubject,
              topic: resolvedTopic,
              userId: session.user.id,
              workspaceId: workspace.workspaceId,
            }),
            "learning-prompt-memory",
            []
          );
          const [modelMessages, promptMemoryBlocks] = await Promise.all([
            modelMessagesPromise,
            promptMemoryBlocksPromise,
          ]);
          emitStartupActivity("Starting model response");
          logInfo("Resolved chat prompt context", {
            chatId: chatSlug,
            workspaceSubjectSummary,
            resolvedSubject,
            resolvedTopic,
            promptMemoryBlockCount: promptMemoryBlocks.length,
          });
          result = streamText({
            model: apollo.languageModel(selectedModel),
            system: APOLLO_PROMPT(
              body.userName ?? session.user.name ?? undefined,
              promptMemoryBlocks.length > 0 ? promptMemoryBlocks : undefined,
              {
                useWidgetSpec: !modelUsesLegacyWidgetSchema(selectedModel),
              }
            ),
            messages: modelMessages,
            maxOutputTokens: 10_000,
            stopWhen: stepCountIs(8),
            tools: modelTools,
            abortSignal: request.signal,
            experimental_transform: smoothStream({
              delayInMs: null,
              chunking: "word",
            }),
            onChunk: async ({ chunk }) => {
              try {
                if (chunk.type === "tool-call") {
                  logInfo("Streaming tool call chunk", {
                    chatId: chatSlug,
                    toolCallId: chunk.toolCallId,
                    toolName: chunk.toolName,
                  });
                }

                if (chunk.type === "tool-result") {
                  logInfo("Streaming tool result chunk", {
                    chatId: chatSlug,
                    toolCallId: chunk.toolCallId,
                    toolName: chunk.toolName,
                  });
                }
              } catch (_error) {}
            },
            onError: ({ error }) => {
              logError("Chat model stream failed", {
                chatId: chatSlug,
                error: formatError(error),
                model: selectedModel,
                providerModel: APOLLO_LANGUAGE_MODEL_IDS[selectedModel],
              });
            },
          });
          emitAgentActivity({
            id: agentActivityId,
            status: "done",
            actions: [
              {
                kind: "read",
                pending: false,
                value: "Model response started",
              },
            ],
          });
          void (async () => {
            emitMisconceptionActivity("Checking misconception memory");
            const misconceptionSignal = await withStartupTimeout(
              detectMisconceptionSignals({
                abortSignal: request.signal,
                latestUserText,
                subject: resolvedSubject,
                topic: resolvedTopic,
                userId: session.user.id,
                workspaceId: workspace.workspaceId,
              }).catch((error) => {
                logWarn(
                  "Failed to detect real-time misconception signal; continuing without it",
                  {
                    chatId: chat.id,
                    error: formatError(error),
                    subject: resolvedSubject,
                    topic: resolvedTopic,
                  }
                );
                return null;
              }),
              "misconception-signal-detector",
              null,
              MISCONCEPTION_SIGNAL_TIMEOUT_MS
            );

            clearMisconceptionActivity();
            logInfo("Resolved post-start misconception signal", {
              chatId: chatSlug,
              misconceptionSignalCandidateCount:
                misconceptionSignal?.candidates.length ?? 0,
              misconceptionSignalMatched: misconceptionSignal?.matched ?? false,
              resolvedSubject,
              resolvedTopic,
            });
          })();
        } catch (error) {
          await clearActiveStreamId(chatSlug, streamId);
          logError("Failed to start model stream", {
            chatId: chatSlug,
            model: selectedModel,
            error,
          });
          apiLogger.requestFailed(500, error, { chatId: chatSlug });
          throw error;
        }

        writer.merge(
          result.toUIMessageStream({
            originalMessages,
            generateMessageId: randomUUID,
            onError: getChatStreamErrorMessage,
            onFinish: async ({ messages, responseMessage, isContinuation }) => {
              try {
                const persistedMessages = getPersistedMessages({
                  originalMessages,
                  streamedMessages: messages as unknown as UIMessage[],
                  responseMessage: responseMessage as unknown as UIMessage,
                  isContinuation,
                });
                const activeStreamId = await getActiveStreamId(chatSlug);
                if (activeStreamId !== streamId) {
                  logInfo("Skipped persisting stale stream messages", {
                    chatId: chatSlug,
                    messageCount: messages.length,
                    streamId,
                    activeStreamId,
                  });
                  return;
                }
                logInfo("Model stream finished", {
                  chatId: chatSlug,
                  messageCount: persistedMessages.length,
                });
                await saveMessagesForChatSlug(
                  session.user.id,
                  chatSlug,
                  persistedMessages,
                  workspace.workspaceId
                );
                await invalidateChatReadCaches(workspace.workspaceId);
                logInfo("Persisted streamed messages", {
                  chatId: chatSlug,
                  messageCount: persistedMessages.length,
                });

                try {
                  const latestSummary = await getLatestSessionSummaryForChat(
                    chat.id
                  ).catch(() => null);
                  const latestUserPosition = Math.max(
                    0,
                    persistedMessages
                      .map((message, index) =>
                        message.role === "user" ? index : -1
                      )
                      .reduce((highest, index) => Math.max(highest, index), -1)
                  );

                  await persistSessionSummaryForCompletedTurn({
                    chatId: chat.id,
                    endedAt: new Date(),
                    latestSummary,
                    latestUserPosition,
                    messages: persistedMessages,
                    previousLastMessageAt: chat.lastMessageAt
                      ? new Date(chat.lastMessageAt)
                      : null,
                    requestStartedAt,
                    userId: session.user.id,
                    workspaceId: workspace.workspaceId,
                  });
                } catch (summaryError) {
                  logError("Failed to persist session summary after stream", {
                    chatId: chatSlug,
                    error: summaryError,
                  });
                }

                try {
                  const totalUsage = await result.totalUsage;
                  const totalTokens = resolveTotalTokens(totalUsage);
                  const creditMultiplier =
                    getModelCreditMultiplier(selectedModel);
                  const requiredCredits = getRequiredChatCredits(
                    totalTokens,
                    selectedModel
                  );
                  const additionalCredits = Math.max(
                    0,
                    requiredCredits - expectedCredits
                  );
                  const unusedCredits = Math.max(
                    0,
                    expectedCredits - requiredCredits
                  );

                  if (additionalCredits > 0) {
                    const meteredUsage = await consumeChatUnits(
                      session.user.id,
                      additionalCredits
                    );
                    if (!meteredUsage.ok) {
                      logInfo("Chat usage over-limit after stream completion", {
                        chatId: chatSlug,
                        totalTokens,
                        requiredCredits,
                        additionalCredits,
                      });
                    }
                  } else if (unusedCredits > 0) {
                    await restoreChatUnits(
                      session.user.id,
                      getRefundedChatUsage(initialUsage, unusedCredits)
                    );
                  }

                  logInfo("Applied token-based chat usage", {
                    chatId: chatSlug,
                    totalTokens,
                    creditMultiplier,
                    expectedCredits,
                    requiredCredits,
                    additionalCredits,
                    unusedCredits,
                  });
                  apiLogger.meter("meter.chat.tokens", {
                    chatId: chatSlug,
                    model: selectedModel,
                    inputTokens: totalUsage.inputTokens ?? null,
                    outputTokens: totalUsage.outputTokens ?? null,
                    totalTokens,
                    creditMultiplier,
                    creditsCharged: requiredCredits,
                  });
                  apiLogger.meter("meter.chat.request", {
                    chatId: chatSlug,
                    model: selectedModel,
                    messageCount: persistedMessages.length,
                  });
                  apiLogger.featureUsed("chat", {
                    chatId: chatSlug,
                    model: selectedModel,
                  });
                } catch (usageError) {
                  if (isAbortLikeError(usageError)) {
                    logInfo("Skipped token-based chat usage after abort", {
                      chatId: chatSlug,
                    });
                  } else {
                    logError("Failed to apply token-based chat usage", {
                      chatId: chatSlug,
                      error: usageError,
                    });
                  }
                }
              } catch (error) {
                logError("Failed to persist streamed chat messages", {
                  chatId: chatSlug,
                  error,
                });
              } finally {
                await clearActiveStreamId(chatSlug, streamId);
                if (idempotencyRedisKey && idempotencyLockAcquired) {
                  await markIdempotencyDone(idempotencyRedisKey, chatSlug);
                }
                logInfo("Cleared active stream id", { chatId: chatSlug });
              }
            },
          })
        );

        void streamChatMetadata();
      },
    });

    const baseResponse = createUIMessageStreamResponse({ stream });
    if (!baseResponse.body) {
      await clearActiveStreamId(chatSlug, streamId);
      return baseResponse;
    }

    const [clientBody, resumableBody] = baseResponse.body.tee();
    const resumableTextStream = resumableBody.pipeThrough(
      new TextDecoderStream()
    );

    void (async () => {
      try {
        const streamContext = createResumableStreamContext({
          waitUntil: after,
          publisher: await getRedisClient(),
          subscriber: await getRedisSubscriber(),
        });

        await streamContext.createNewResumableStream(
          streamId,
          () => resumableTextStream
        );
      } catch (error) {
        await clearActiveStreamId(chatSlug, streamId);
        logError("Failed to create resumable chat stream", {
          chatSlug,
          streamId,
          error: formatError(error),
        });
      }
    })();

    apiLogger.requestSucceeded(200, {
      chatId: chatSlug,
      selectedModel: body.selectedModel ?? "apollo-apex",
      messageCount: originalMessages.length,
    });

    return new Response(clientBody, {
      status: baseResponse.status,
      statusText: baseResponse.statusText,
      headers: baseResponse.headers,
    });
  } catch (error) {
    logError("Unhandled chat POST error", { error: formatError(error) });
    if (idempotencyRedisKey && idempotencyLockAcquired) {
      await clearIdempotencyKey(idempotencyRedisKey);
    }
    apiLogger.requestFailed(500, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const apiLogger = createApiLogger({
    request,
    route: "/api/chat",
    feature: "chat",
    userId: session?.user?.id ?? null,
  });
  apiLogger.requestStarted();

  try {
    if (!session?.user) {
      apiLogger.requestFailed(401, "Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      apiLogger.requestFailed(400, "Missing chat id");
      return NextResponse.json({ error: "Missing chat id" }, { status: 400 });
    }

    const activeOrganizationId =
      (session as { session?: { activeOrganizationId?: string | null } })
        .session?.activeOrganizationId ?? null;
    const workspace = await resolveWorkspaceForUser(
      session.user.id,
      activeOrganizationId
    );
    if (!workspace) {
      apiLogger.requestFailed(404, "Workspace not found");
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const deleted = await deleteChatForUser(
      session.user.id,
      id,
      workspace.workspaceId
    );
    if (!deleted) {
      apiLogger.requestFailed(404, "Chat not found", { chatId: id });
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const activeStreamId = await getActiveStreamId(id);
    if (activeStreamId) {
      await clearActiveStreamId(id, activeStreamId);
    }
    await invalidateChatReadCaches(workspace.workspaceId);
    apiLogger.featureUsed("chat.delete", { chatId: id });
    apiLogger.requestSucceeded(200, { chatId: id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("Unhandled chat DELETE error", { error: formatError(error) });
    apiLogger.requestFailed(500, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
