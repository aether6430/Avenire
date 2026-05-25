import { createHash } from "node:crypto";
import {
  ensureManagedRedisClient,
  type ManagedRedisClient,
} from "@/lib/redis-client";

const DEFAULT_TOOL_RESULT_CACHE_TTL_SECONDS = 60 * 5;
const TOOL_RESULT_CACHE_PREFIX = "ai-tool-result:v1:";
const TOOL_RESULT_SCOPE_VERSION_PREFIX = "ai-tool-result-scope:v1:";
const DEFAULT_TOOL_RESULT_SCOPE_VERSION = "0";

type CacheStatus = "hit" | "miss";

interface MemoryCacheEntry {
  expiresAtMs: number;
  value: unknown;
}

interface CacheDependencies {
  getRedisClient?: () => Promise<ManagedRedisClient | null>;
  memoryCache?: Map<string, MemoryCacheEntry>;
  nowMs?: () => number;
}

export interface CachedToolResult<T> {
  cache: CacheStatus;
  value: T;
}

export interface CachedToolResultInput<T> {
  execute: () => Promise<T>;
  input: unknown;
  scope: Record<string, unknown>;
  toolName: string;
  ttlSeconds?: number;
  validate?: (value: unknown) => value is T;
}

let redisClient: ManagedRedisClient | null = null;
const memoryCache = new Map<string, MemoryCacheEntry>();
const scopeVersionCache = new Map<string, string>();

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

export function createToolResultCacheKey(input: {
  input: unknown;
  scope: Record<string, unknown>;
  toolName: string;
  version?: string;
}) {
  const digest = createHash("sha256")
    .update(
      stableStringify({
        input: input.input,
        scope: input.scope,
        toolName: input.toolName,
        version: input.version ?? DEFAULT_TOOL_RESULT_SCOPE_VERSION,
      })
    )
    .digest("hex");

  return `${TOOL_RESULT_CACHE_PREFIX}${input.toolName}:${digest}`;
}

export function createToolResultScopeVersionKey(input: {
  scope: Record<string, unknown>;
  toolName: string;
}) {
  const digest = createHash("sha256")
    .update(
      stableStringify({
        scope: input.scope,
        toolName: input.toolName,
      })
    )
    .digest("hex");

  return `${TOOL_RESULT_SCOPE_VERSION_PREFIX}${input.toolName}:${digest}`;
}

async function getDefaultRedisClient() {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    return null;
  }

  redisClient = await ensureManagedRedisClient(
    redisClient,
    redisUrl,
    "ai-tool-result-cache"
  );
  return redisClient;
}

function readMemoryCache<T>(
  cache: Map<string, MemoryCacheEntry>,
  key: string,
  nowMs: number,
  validate?: (value: unknown) => value is T
) {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAtMs <= nowMs) {
    cache.delete(key);
    return null;
  }
  if (validate && !validate(entry.value)) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

async function getToolResultScopeVersion(
  input: {
    scope: Record<string, unknown>;
    toolName: string;
  },
  dependencies: CacheDependencies = {}
) {
  const key = createToolResultScopeVersionKey(input);
  const cachedVersion = scopeVersionCache.get(key);
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    const client =
      dependencies.getRedisClient !== undefined
        ? await dependencies.getRedisClient()
        : await getDefaultRedisClient();
    const persistedVersion = await client?.get(key);
    if (persistedVersion) {
      scopeVersionCache.set(key, persistedVersion);
      return persistedVersion;
    }
  } catch {
    // Version reads are best-effort.
  }

  return DEFAULT_TOOL_RESULT_SCOPE_VERSION;
}

export async function invalidateToolResultScope(
  input: {
    scope: Record<string, unknown>;
    toolName: string;
  },
  dependencies: CacheDependencies = {}
) {
  const key = createToolResultScopeVersionKey(input);
  const currentVersion = await getToolResultScopeVersion(input, dependencies);
  const parsedVersion = Number.parseInt(currentVersion, 10);
  const nextVersion = Number.isFinite(parsedVersion)
    ? String(parsedVersion + 1)
    : String(Date.now());

  scopeVersionCache.set(key, nextVersion);

  try {
    const client =
      dependencies.getRedisClient !== undefined
        ? await dependencies.getRedisClient()
        : await getDefaultRedisClient();
    await client?.set(key, nextVersion);
  } catch {
    // Invalidation is best-effort; stale cache is preferable to failed mutations.
  }
}

export async function getCachedToolResult<T>(
  input: CachedToolResultInput<T>,
  dependencies: CacheDependencies = {}
): Promise<CachedToolResult<T>> {
  const ttlSeconds = input.ttlSeconds ?? DEFAULT_TOOL_RESULT_CACHE_TTL_SECONDS;
  const version = await getToolResultScopeVersion(
    {
      scope: input.scope,
      toolName: input.toolName,
    },
    dependencies
  );
  const key = createToolResultCacheKey({
    ...input,
    version,
  });
  const cache = dependencies.memoryCache ?? memoryCache;
  const nowMs = dependencies.nowMs?.() ?? Date.now();

  const memoryValue = readMemoryCache(cache, key, nowMs, input.validate);
  if (memoryValue !== null) {
    return { cache: "hit", value: memoryValue };
  }

  try {
    const client =
      dependencies.getRedisClient !== undefined
        ? await dependencies.getRedisClient()
        : await getDefaultRedisClient();
    const raw = await client?.get(key);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (!input.validate || input.validate(parsed)) {
        cache.set(key, {
          expiresAtMs: nowMs + ttlSeconds * 1000,
          value: parsed,
        });
        return { cache: "hit", value: parsed as T };
      }
    }
  } catch {
    // Cache failures should not block tool execution.
  }

  const value = await input.execute();
  cache.set(key, {
    expiresAtMs: nowMs + ttlSeconds * 1000,
    value,
  });

  try {
    const client =
      dependencies.getRedisClient !== undefined
        ? await dependencies.getRedisClient()
        : await getDefaultRedisClient();
    await client?.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch {
    // Cache writes are best-effort.
  }

  return { cache: "miss", value };
}
