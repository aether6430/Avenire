import { createHash } from "node:crypto";
import type { PromptMemoryBlock } from "@avenire/ai";
import { getActiveMisconceptionContext } from "@/lib/chat-tools/chat-tool-misconception-runtime";
import { buildStudentProfileContext } from "@/lib/student-profile";
import {
  buildPromptMemoryBlocks,
  isPromptMemoryBlockArray,
} from "./chat-route-model";
import { getRedisClient } from "./chat-stream-store";

const SESSION_CLOSE_KEY_PREFIX = "chat:session-close:";
const SESSION_CLOSE_TTL_SECONDS = 60 * 60 * 24;
const LEARNING_CONTEXT_CACHE_PREFIX = "chat-learning-context:v1:";
const LEARNING_CONTEXT_CACHE_TTL_SECONDS = 60 * 60 * 3;
const memoryLearningContextCache = new Map<
  string,
  { expiresAtMs: number; value: PromptMemoryBlock[] }
>();

function normalizeLearningContextScopePart(value: string | null | undefined) {
  if (typeof value !== "string") {
    return "none";
  }

  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : "none";
}

export function buildSessionCloseKey(input: {
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

export async function markSessionCloseSeen(key: string) {
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

export function buildLearningContextCacheKey(input: {
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
    normalizeLearningContextScopePart(input.subject),
    normalizeLearningContextScopePart(input.topic),
    normalizeLearningContextScopePart(input.recentSummaryUpdatedAt),
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

export async function getCachedLearningPromptMemoryBlocks(input: {
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

export function buildChatIdempotencyRedisKey(input: {
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

export async function tryAcquireIdempotencyLock(key: string) {
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

export async function getIdempotencyState(key: string) {
  try {
    const client = await getRedisClient();
    return await client.get(key);
  } catch {
    return null;
  }
}

export async function markIdempotencyDone(key: string, chatSlug: string) {
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

export async function clearIdempotencyKey(key: string) {
  try {
    const client = await getRedisClient();
    await client.del(key);
  } catch {
    // ignore idempotency cleanup failures
  }
}
