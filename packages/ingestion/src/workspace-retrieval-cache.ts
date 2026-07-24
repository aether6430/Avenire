import { createHash } from "node:crypto";
import {
  ensureManagedRedisClient,
  type ManagedRedisClient,
} from "./runtime/redis-client";

const DEFAULT_TTL_SECONDS = 45;
const RETRIEVAL_CACHE_VERSION = "v5";
const RECENT_RETRIEVAL_QUERY_TTL_SECONDS = 60 * 60 * 24;
const RECENT_RETRIEVAL_QUERY_LIMIT = 80;
const RETRIEVAL_WARMUP_LEASE_TTL_SECONDS = 60 * 15;

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
  sourceType:
    | "pdf"
    | "image"
    | "video"
    | "audio"
    | "document"
    | "markdown"
    | "link"
    | null;
  userId: string | null;
  workspaceUuid: string;
}

export interface WorkspaceRetrievalStore {
  acquireWarmupLease(workspaceUuid: string): Promise<boolean>;
  createCacheKey(input: {
    corpusFingerprint: string;
    limit?: number;
    mode?: "auto" | "fast" | "full";
    provider?: string;
    query: string;
    sourceType?: string;
    userId?: string;
    workspaceUuid: string;
  }): string;
  getCachedResult<T>(key: string): Promise<T | null>;
  listRecentQueries(workspaceUuid: string): Promise<RecentRetrievalQuery[]>;
  recordRecentQuery(input: RecentRetrievalQuery): Promise<void>;
  setCachedResult(key: string, value: unknown): Promise<void>;
}

function toPositiveInt(raw: string | undefined, fallback: number) {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveTtlSeconds() {
  return Math.max(
    5,
    toPositiveInt(
      process.env.RETRIEVAL_QUERY_CACHE_TTL_SECONDS,
      DEFAULT_TTL_SECONDS
    )
  );
}

function normalizeQuery(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function cleanupMemoryCache(cache: Map<string, MemoryCacheEntry>) {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAtMs <= now) {
      cache.delete(key);
    }
  }
}

function recentRetrievalQueryKey(workspaceUuid: string) {
  return `retrieval:recent:${workspaceUuid}`;
}

export function createWorkspaceRetrievalStore(): WorkspaceRetrievalStore {
  let client: ManagedRedisClient | null = null;
  const memoryCache = new Map<string, MemoryCacheEntry>();
  const recentRetrievalQueryMemory = new Map<string, MemoryCacheEntry>();
  const warmupLeaseMemory = new Map<string, MemoryCacheEntry>();

  async function getRedisClient() {
    const redisUrl = process.env.REDIS_URL?.trim() ?? "";
    if (!redisUrl) {
      return null;
    }

    client = await ensureManagedRedisClient(
      client,
      redisUrl,
      "workspace-retrieval"
    );
    return client;
  }

  return {
    createCacheKey(input) {
      const hash = createHash("sha256")
        .update(
          JSON.stringify({
            corpusFingerprint: input.corpusFingerprint,
            limit: input.limit ?? null,
            mode: input.mode ?? null,
            provider: input.provider ?? null,
            query: normalizeQuery(input.query),
            sourceType: input.sourceType ?? null,
            userId: input.userId ?? null,
            workspaceUuid: input.workspaceUuid,
          })
        )
        .digest("hex");

      return `retrieval:query:${RETRIEVAL_CACHE_VERSION}:${input.workspaceUuid}:${hash}`;
    },

    async getCachedResult<T>(key: string): Promise<T | null> {
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

      cleanupMemoryCache(memoryCache);
      const entry = memoryCache.get(key);
      if (!entry || entry.expiresAtMs <= Date.now()) {
        return null;
      }

      return entry.value as T;
    },

    async setCachedResult(key: string, value: unknown) {
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
    },

    async recordRecentQuery(input: RecentRetrievalQuery) {
      const redis = await getRedisClient();
      const key = recentRetrievalQueryKey(input.workspaceUuid);
      const encoded = JSON.stringify(input);
      if (redis) {
        await redis.lPush(key, encoded);
        await redis.lTrim(key, 0, RECENT_RETRIEVAL_QUERY_LIMIT - 1);
        await redis.expire(key, RECENT_RETRIEVAL_QUERY_TTL_SECONDS);
        return;
      }

      cleanupMemoryCache(recentRetrievalQueryMemory);
      const existing = recentRetrievalQueryMemory.get(key);
      const nextValues = [
        input,
        ...((existing?.value as RecentRetrievalQuery[] | undefined) ?? []),
      ].slice(0, RECENT_RETRIEVAL_QUERY_LIMIT);
      recentRetrievalQueryMemory.set(key, {
        expiresAtMs: Date.now() + RECENT_RETRIEVAL_QUERY_TTL_SECONDS * 1000,
        value: nextValues,
      });
    },

    async listRecentQueries(workspaceUuid: string) {
      const redis = await getRedisClient();
      const key = recentRetrievalQueryKey(workspaceUuid);
      if (redis) {
        const rows = await redis.lRange(
          key,
          0,
          RECENT_RETRIEVAL_QUERY_LIMIT - 1
        );
        return rows
          .map((row: string) => {
            try {
              return JSON.parse(row) as RecentRetrievalQuery;
            } catch {
              return null;
            }
          })
          .filter(
            (
              entry: RecentRetrievalQuery | null
            ): entry is RecentRetrievalQuery => Boolean(entry)
          );
      }

      cleanupMemoryCache(recentRetrievalQueryMemory);
      return ((recentRetrievalQueryMemory.get(key)?.value as
        | RecentRetrievalQuery[]
        | undefined) ?? []) as RecentRetrievalQuery[];
    },

    async acquireWarmupLease(workspaceUuid: string) {
      const redis = await getRedisClient();
      const key = `retrieval:warmup:lease:${workspaceUuid}`;
      if (redis) {
        const acquired = await redis.set(key, "1", {
          EX: RETRIEVAL_WARMUP_LEASE_TTL_SECONDS,
          NX: true,
        });
        return acquired === "OK";
      }

      cleanupMemoryCache(warmupLeaseMemory);
      if (warmupLeaseMemory.has(key)) {
        return false;
      }

      warmupLeaseMemory.set(key, {
        expiresAtMs: Date.now() + RETRIEVAL_WARMUP_LEASE_TTL_SECONDS * 1000,
        value: true,
      });
      return true;
    },
  };
}
