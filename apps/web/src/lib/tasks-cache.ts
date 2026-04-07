import { createHash } from "node:crypto";
import type { RedisClientType } from "redis";
import { ensureManagedRedisClient } from "@/lib/redis-client";

const redisUrl = process.env.REDIS_URL;
const DEFAULT_TTL_SECONDS = 60;
const TASK_CACHE_VERSION = "v1";

let client: RedisClientType | null = null;

interface MemoryCacheEntry {
  expiresAtMs: number;
  value: unknown;
}

const memoryCache = new Map<string, MemoryCacheEntry>();
const memoryVersions = new Map<string, string>();

function toPositiveInt(raw: string | undefined, fallback: number) {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveTtlSeconds() {
  return Math.max(
    10,
    toPositiveInt(process.env.TASKS_CACHE_TTL_SECONDS, DEFAULT_TTL_SECONDS)
  );
}

async function getRedisClient() {
  if (!redisUrl) {
    return null;
  }

  client = await ensureManagedRedisClient(client, redisUrl, "tasks-cache");
  return client;
}

function cleanupMemoryCache() {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAtMs <= now) {
      memoryCache.delete(key);
    }
  }
}

function versionKey(workspaceUuid: string) {
  return `tasks:list:${TASK_CACHE_VERSION}:version:${workspaceUuid}`;
}

export async function getTaskListCacheVersion(
  workspaceUuid: string
) {
  const key = versionKey(workspaceUuid);
  const redis = await getRedisClient();
  if (redis) {
    const existing = await redis.get(key);
    if (existing) {
      return existing;
    }
    const next = Date.now().toString();
    await redis.set(key, next, { EX: 60 * 60 * 24 });
    return next;
  }

  const existing = memoryVersions.get(key);
  if (existing) {
    return existing;
  }
  const next = Date.now().toString();
  memoryVersions.set(key, next);
  return next;
}

export async function invalidateTaskListCache(
  workspaceUuid: string
) {
  const next = Date.now().toString();
  const key = versionKey(workspaceUuid);
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(key, next, { EX: 60 * 60 * 24 });
    return;
  }
  memoryVersions.set(key, next);
}

export function createTaskListCacheKey(input: {
  assigneeUserId?: string;
  dueBefore?: string;
  includeCompleted?: boolean;
  limit?: number;
  status?: string;
  version: string;
  workspaceUuid: string;
}) {
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        assigneeUserId: input.assigneeUserId ?? null,
        dueBefore: input.dueBefore ?? null,
        includeCompleted: input.includeCompleted ?? false,
        limit: input.limit ?? null,
        status: input.status ?? null,
      })
    )
    .digest("hex");

  return `tasks:list:${TASK_CACHE_VERSION}:${input.workspaceUuid}:${input.version}:${hash}`;
}

export async function getCachedTaskList<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (redis) {
    const raw = await redis.get(key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  cleanupMemoryCache();
  const entry = memoryCache.get(key);
  if (!entry || entry.expiresAtMs <= Date.now()) {
    return null;
  }
  return entry.value as T;
}

export async function setCachedTaskList(key: string, value: unknown) {
  const ttlSeconds = resolveTtlSeconds();
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return;
  }

  memoryCache.set(key, {
    expiresAtMs: Date.now() + ttlSeconds * 1000,
    value,
  });
}
