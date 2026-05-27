import { createHash } from "node:crypto";
import {
  ensureManagedRedisClient,
  type ManagedRedisClient,
} from "@/lib/redis-client";

const redisUrl = process.env.REDIS_URL;
const CACHE_VERSION = "v1";
const DEFAULT_TTL_SECONDS = 60;
const VERSION_TTL_SECONDS = 60 * 60 * 24;

let client: ManagedRedisClient | null = null;

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

function resolveTtlSeconds(namespace: string) {
  const envKey = `${namespace.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_CACHE_TTL_SECONDS`;
  return Math.max(
    10,
    toPositiveInt(process.env[envKey], DEFAULT_TTL_SECONDS)
  );
}

async function getRedisClient() {
  if (!redisUrl) {
    return null;
  }

  client = await ensureManagedRedisClient(client, redisUrl, "route-cache");
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

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function versionKey(namespace: string, scope: string) {
  return `${namespace}:${CACHE_VERSION}:version:${scope}`;
}

export async function getRouteCacheVersion(namespace: string, scope: string) {
  const key = versionKey(namespace, scope);
  const redis = await getRedisClient();
  if (redis) {
    const existing = await redis.get(key);
    if (existing) {
      return existing;
    }
    const next = Date.now().toString();
    await redis.set(key, next, { EX: VERSION_TTL_SECONDS });
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

export async function invalidateRouteCache(namespace: string, scope: string) {
  const next = Date.now().toString();
  const key = versionKey(namespace, scope);
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(key, next, { EX: VERSION_TTL_SECONDS });
    return;
  }
  memoryVersions.set(key, next);
}

export function createRouteCacheKey(input: {
  namespace: string;
  params?: unknown;
  scope: string;
  version: string;
}) {
  const hash = createHash("sha256")
    .update(stableStringify(input.params ?? null))
    .digest("hex");

  return `${input.namespace}:${CACHE_VERSION}:${input.scope}:${input.version}:${hash}`;
}

export async function getCachedRoute<T>(key: string): Promise<T | null> {
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

export async function setCachedRoute(
  namespace: string,
  key: string,
  value: unknown
) {
  const ttlSeconds = resolveTtlSeconds(namespace);
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
