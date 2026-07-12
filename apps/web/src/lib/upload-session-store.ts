import { randomUUID } from "node:crypto";
import {
  ensureManagedRedisClient,
  type ManagedRedisClient,
} from "@/lib/redis-client";

export type UploadSessionStatus =
  | "created"
  | "uploading"
  | "uploaded"
  | "verified"
  | "ingestion_queued"
  | "failed";

export interface UploadSessionRecord {
  checksumSha256: string | null;
  createdAt: string;
  expiresAt: string;
  folderId: string;
  id: string;
  mimeType: string | null;
  name: string;
  result?: {
    fileId: string;
    ingestionJobId: string | null;
    deduplicated: boolean;
  } | null;
  sizeBytes: number;
  status: UploadSessionStatus;
  updatedAt: string;
  upload?: {
    storageKey: string;
    storageUrl: string;
    mimeType: string | null;
    sizeBytes: number;
    checksumSha256: string | null;
  } | null;
  userId: string;
  workspaceUuid: string;
}

const redisUrl = process.env.REDIS_URL;
const SESSION_TTL_SECONDS = 24 * 60 * 60;

let client: ManagedRedisClient | null = null;

interface MemorySessionEntry {
  expiresAtMs: number;
  session: UploadSessionRecord;
}

const memorySessions = new Map<string, MemorySessionEntry>();
const memoryCompletionLocks = new Map<string, Promise<void>>();

function getSessionKey(sessionId: string) {
  return `upload:session:${sessionId}`;
}

async function getRedisClient() {
  if (!redisUrl) {
    return null;
  }

  client = await ensureManagedRedisClient(
    client,
    redisUrl,
    "upload-session-store"
  );
  return client;
}

function cleanupMemorySessions() {
  const now = Date.now();
  for (const [key, value] of memorySessions.entries()) {
    if (value.expiresAtMs <= now) {
      memorySessions.delete(key);
    }
  }
}

export async function createUploadSession(input: {
  userId: string;
  workspaceUuid: string;
  folderId: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number;
  checksumSha256: string | null;
  ttlSeconds?: number;
}) {
  const ttlSeconds = Math.max(60, input.ttlSeconds ?? SESSION_TTL_SECONDS);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  const session: UploadSessionRecord = {
    id: randomUUID(),
    userId: input.userId,
    workspaceUuid: input.workspaceUuid,
    folderId: input.folderId,
    name: input.name,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    checksumSha256: input.checksumSha256,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: "created",
    upload: null,
    result: null,
  };

  const redis = await getRedisClient();
  if (redis) {
    await redis.set(getSessionKey(session.id), JSON.stringify(session), {
      EX: ttlSeconds,
    });
    return session;
  }

  memorySessions.set(session.id, {
    session,
    expiresAtMs: expiresAt.getTime(),
  });
  return session;
}

export async function getUploadSession(sessionId: string) {
  const redis = await getRedisClient();
  if (redis) {
    const raw = await redis.get(getSessionKey(sessionId));
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as UploadSessionRecord;
    } catch {
      return null;
    }
  }

  cleanupMemorySessions();
  return memorySessions.get(sessionId)?.session ?? null;
}

export async function saveUploadSession(
  session: UploadSessionRecord,
  options?: { ttlSeconds?: number }
) {
  const ttlSeconds = Math.max(60, options?.ttlSeconds ?? SESSION_TTL_SECONDS);
  const next: UploadSessionRecord = {
    ...session,
    updatedAt: new Date().toISOString(),
  };

  const redis = await getRedisClient();
  if (redis) {
    await redis.set(getSessionKey(session.id), JSON.stringify(next), {
      EX: ttlSeconds,
    });
    return next;
  }

  memorySessions.set(session.id, {
    session: next,
    expiresAtMs: Date.now() + ttlSeconds * 1000,
  });
  return next;
}

export async function withUploadSessionCompletionLock<A>(
  sessionId: string,
  run: () => Promise<A>
): Promise<A> {
  const redis = await getRedisClient();
  if (redis) {
    const lockKey = `upload:completion-lock:${sessionId}`;
    const lockValue = randomUUID();
    for (let attempt = 0; attempt < 300; attempt += 1) {
      const acquired = await redis.set(lockKey, lockValue, { NX: true, EX: 120 });
      if (acquired === "OK") {
        try {
          return await run();
        } finally {
          await redis.eval(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            { keys: [lockKey], arguments: [lockValue] }
          );
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw Object.assign(new Error("Upload completion is already in progress"), {
      code: "UPLOAD_COMPLETION_BUSY",
    });
  }

  const previous = memoryCompletionLocks.get(sessionId) ?? Promise.resolve();
  let release = () => {};
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => current);
  memoryCompletionLocks.set(sessionId, queued);
  await previous;
  try {
    return await run();
  } finally {
    release();
    if (memoryCompletionLocks.get(sessionId) === queued) {
      memoryCompletionLocks.delete(sessionId);
    }
  }
}
