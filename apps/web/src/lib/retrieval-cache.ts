import { createHash } from "node:crypto";
import type { RedisClientType } from "redis";
import { ensureManagedRedisClient } from "@/lib/redis-client";

const redisUrl = process.env.REDIS_URL;
const DEFAULT_TTL_SECONDS = 45;
const RETRIEVAL_CACHE_VERSION = "v5";
const RECENT_RETRIEVAL_QUERY_TTL_SECONDS = 60 * 60 * 24;
const RECENT_RETRIEVAL_QUERY_LIMIT = 80;
const RETRIEVAL_WARMUP_LEASE_TTL_SECONDS = 60 * 15;

let client: RedisClientType | null = null;

interface MemoryCacheEntry {
  expiresAtMs: number;
  value: unknown;
}

export interface RecentRetrievalQuery {
  cache: "hit" | "miss";
  confidence: number;
  createdAt: string;
  origin: "api" | "chat" | "unknown";
  path: "fast" | "slow";
  provider: string | null;
  query: string;
  sourceType: "pdf" | "image" | "video" | "audio" | "markdown" | "link" | null;
  userId: string | null;
  workspaceUuid: string;
}

const memoryCache = new Map<string, MemoryCacheEntry>();
const recentRetrievalQueryMemory = new Map<string, MemoryCacheEntry>();
const warmupLeaseMemory = new Map<string, MemoryCacheEntry>();

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

function normalizeQuery(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function createRetrievalCacheKey(input: {
  corpusFingerprint: string;
  userId?: string;
  workspaceUuid: string;
  query: string;
  limit?: number;
  mode?: "auto" | "fast" | "full";
  sourceType?: string;
  provider?: string;
}) {
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        corpusFingerprint: input.corpusFingerprint,
        mode: input.mode ?? null,
        provider: input.provider ?? null,
        query: normalizeQuery(input.query),
        limit: input.limit ?? null,
        sourceType: input.sourceType ?? null,
        userId: input.userId ?? null,
        workspaceUuid: input.workspaceUuid,
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
    expiresAtMs: Date.now() + ttlSeconds * 1000,
    value,
  });
}

function cleanupRecentRetrievalQueryMemory() {
  const now = Date.now();
  for (const [key, entry] of recentRetrievalQueryMemory.entries()) {
    if (entry.expiresAtMs <= now) {
      recentRetrievalQueryMemory.delete(key);
    }
  }
}

function cleanupWarmupLeaseMemory() {
  const now = Date.now();
  for (const [key, entry] of warmupLeaseMemory.entries()) {
    if (entry.expiresAtMs <= now) {
      warmupLeaseMemory.delete(key);
    }
  }
}

export function parseRetrievalWarmupSampleRate(raw: string | undefined) {
  const parsed = Number.parseFloat(raw ?? "");
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.min(1, parsed);
}

function recentRetrievalQueryKey(workspaceUuid: string) {
  return `retrieval:recent:${workspaceUuid}`;
}

export async function recordRecentRetrievalQuery(input: RecentRetrievalQuery) {
  const redis = await getRedisClient();
  const key = recentRetrievalQueryKey(input.workspaceUuid);
  const encoded = JSON.stringify(input);
  if (redis) {
    await redis.lPush(key, encoded);
    await redis.lTrim(key, 0, RECENT_RETRIEVAL_QUERY_LIMIT - 1);
    await redis.expire(key, RECENT_RETRIEVAL_QUERY_TTL_SECONDS);
    return;
  }

  cleanupRecentRetrievalQueryMemory();
  const existing = recentRetrievalQueryMemory.get(key);
  const nextValues = [
    input,
    ...((existing?.value as RecentRetrievalQuery[] | undefined) ?? []),
  ].slice(0, RECENT_RETRIEVAL_QUERY_LIMIT);
  recentRetrievalQueryMemory.set(key, {
    expiresAtMs: Date.now() + RECENT_RETRIEVAL_QUERY_TTL_SECONDS * 1000,
    value: nextValues,
  });
}

export async function listRecentRetrievalQueries(workspaceUuid: string) {
  const redis = await getRedisClient();
  const key = recentRetrievalQueryKey(workspaceUuid);
  if (redis) {
    const rows = await redis.lRange(key, 0, RECENT_RETRIEVAL_QUERY_LIMIT - 1);
    return rows
      .map((row) => {
        try {
          return JSON.parse(row) as RecentRetrievalQuery;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is RecentRetrievalQuery => Boolean(entry));
  }

  cleanupRecentRetrievalQueryMemory();
  return ((recentRetrievalQueryMemory.get(key)?.value as RecentRetrievalQuery[] | undefined) ??
    []) as RecentRetrievalQuery[];
}

export async function acquireRetrievalWarmupLease(workspaceUuid: string) {
  const redis = await getRedisClient();
  const key = `retrieval:warmup:lease:${workspaceUuid}`;
  if (redis) {
    const acquired = await redis.set(key, "1", {
      EX: RETRIEVAL_WARMUP_LEASE_TTL_SECONDS,
      NX: true,
    });
    return acquired === "OK";
  }

  cleanupWarmupLeaseMemory();
  if (warmupLeaseMemory.has(key)) {
    return false;
  }

  warmupLeaseMemory.set(key, {
    expiresAtMs: Date.now() + RETRIEVAL_WARMUP_LEASE_TTL_SECONDS * 1000,
    value: true,
  });
  return true;
}
