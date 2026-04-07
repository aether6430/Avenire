import { createHash } from "node:crypto";
import type { RedisClientType } from "redis";
import { ensureManagedRedisClient } from "@/lib/redis-client";

const redisUrl = process.env.REDIS_URL;
const DEFAULT_TTL_SECONDS = 45;
const RETRIEVAL_CACHE_VERSION = "v2";

let client: RedisClientType | null = null;

interface MemoryCacheEntry {
  expiresAtMs: number;
  value: unknown;
}

const memoryCache = new Map<string, MemoryCacheEntry>();

function toPositiveInt(raw: string | undefined, fallback: number) {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveTtlSeconds() {
  return Math.max(
    5,
    toPositiveInt(process.env.RETRIEVAL_QUERY_CACHE_TTL_SECONDS, DEFAULT_TTL_SECONDS)
  );
}

async function getRedisClient() {
  if (!redisUrl) {
    return null;
  }

  client = await ensureManagedRedisClient(client, redisUrl, "retrieval-cache");
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

export function createRetrievalCacheKey(input: {
  userId?: string;
  workspaceUuid: string;
  query: string;
  limit?: number;
  sourceType?: string;
  provider?: string;
}) {
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        userId: input.userId ?? null,
        workspaceUuid: input.workspaceUuid,
        query: input.query.trim().toLowerCase(),
        limit: input.limit ?? null,
        sourceType: input.sourceType ?? null,
        provider: input.provider ?? null,
      })
    )
    .digest("hex");

  return `retrieval:query:${RETRIEVAL_CACHE_VERSION}:${input.workspaceUuid}:${hash}`;
}

export async function getCachedRetrievalResult<T>(key: string): Promise<T | null> {
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

export async function setCachedRetrievalResult(key: string, value: unknown) {
  const ttlSeconds = resolveTtlSeconds();
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return;
  }

  memoryCache.set(key, {
    value,
    expiresAtMs: Date.now() + ttlSeconds * 1000,
  });
}
