import {
  ensureManagedRedisClient,
  type ManagedRedisClient,
} from "@/lib/redis-client";

const redisUrl = process.env.REDIS_URL;
const ACTIVE_STREAM_KEY_PREFIX = "chat-active-stream:";
// Failsafe for crashed/serverless instances that never reach stream cleanup.
const ACTIVE_STREAM_TTL_SECONDS = 60 * 60;

let redisClient: ManagedRedisClient | null = null;

function hasRedisConfigured() {
  return Boolean(redisUrl);
}

export async function getRedisClient() {
  if (!redisUrl) {
    throw new Error("REDIS_URL is not configured");
  }

  redisClient = await ensureManagedRedisClient(
    redisClient,
    redisUrl,
    "chat-stream-store"
  );
  if (!redisClient) {
    throw new Error("Redis client initialization failed");
  }

  return redisClient;
}

export async function getActiveStreamId(chatId: string) {
  if (!hasRedisConfigured()) {
    return null;
  }

  try {
    const client = await getRedisClient();
    const value = await client.get(`${ACTIVE_STREAM_KEY_PREFIX}${chatId}`);
    return value ?? null;
  } catch (error) {
    console.error("Failed to read active stream id", { chatId, error });
    return null;
  }
}

export async function setActiveStreamId(chatId: string, streamPath: string) {
  if (!hasRedisConfigured()) {
    return;
  }

  try {
    const client = await getRedisClient();
    await client.set(`${ACTIVE_STREAM_KEY_PREFIX}${chatId}`, streamPath, {
      expiration: { type: "EX", value: ACTIVE_STREAM_TTL_SECONDS },
    });
  } catch (error) {
    console.error("Failed to set active stream id", {
      chatId,
      streamPath,
      error,
    });
  }
}

export async function clearActiveStreamId(chatId: string, streamPath: string) {
  if (!hasRedisConfigured()) {
    return;
  }

  try {
    const client = await getRedisClient();
    const key = `${ACTIVE_STREAM_KEY_PREFIX}${chatId}`;
    await client.eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0",
      {
        keys: [key],
        arguments: [streamPath],
      }
    );
  } catch (error) {
    console.error("Failed to clear active stream id", {
      chatId,
      streamPath,
      error,
    });
  }
}
