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
const memoryScopeVersions = new Map<string, string>();

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

export async function getCachedToolResult<T>(
  input: CachedToolResultInput<T>,
  dependencies: CacheDependencies = {}
): Promise<CachedToolResult<T>> {
  const ttlSeconds =
    input.ttlSeconds ?? DEFAULT_TOOL_RESULT_CACHE_TTL_SECONDS;
  const scopeVersionKey = createToolResultScopeVersionKey(input);
  let version =
    memoryScopeVersions.get(scopeVersionKey) ?? DEFAULT_TOOL_RESULT_SCOPE_VERSION;
  const cache = dependencies.memoryCache ?? memoryCache;
  const nowMs = dependencies.nowMs?.() ?? Date.now();

  try {
    const client =
      dependencies.getRedisClient !== undefined
        ? await dependencies.getRedisClient()
        : await getDefaultRedisClient();
    version = (await client?.get(scopeVersionKey)) ?? version;
  } catch {
    // Cache scope reads are best-effort.
  }

  const key = createToolResultCacheKey({ ...input, version });

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

export async function invalidateToolResultScope(input: {
  scope: Record<string, unknown>;
  toolName: string;
}) {
  const key = createToolResultScopeVersionKey(input);
  const version = Date.now().toString(36);
  memoryScopeVersions.set(key, version);

  try {
    const client = await getDefaultRedisClient();
    await client?.set(key, version, { EX: DEFAULT_TOOL_RESULT_CACHE_TTL_SECONDS });
  } catch {
    // Cache invalidation is best-effort.
  }
}
