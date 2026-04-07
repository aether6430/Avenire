import type { RedisClientType } from "redis";
import { ensureManagedRedisClient } from "@/lib/redis-client";

const redisUrl = process.env.REDIS_URL;
const ACTIVE_STREAM_KEY_PREFIX = "chat-active-stream:";

let redisClient: RedisClientType | null = null;
let redisSubscriber: RedisClientType | null = null;

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

export async function getRedisSubscriber() {
  if (!redisUrl) {
    throw new Error("REDIS_URL is not configured");
  }

  redisSubscriber = await ensureManagedRedisClient(
    redisSubscriber,
    redisUrl,
    "chat-stream-store"
  );
  if (!redisSubscriber) {
    throw new Error("Redis subscriber initialization failed");
  }

  return redisSubscriber;
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

export async function setActiveStreamId(chatId: string, streamId: string) {
  if (!hasRedisConfigured()) {
    return;
  }

  try {
    const client = await getRedisClient();
    await client.set(`${ACTIVE_STREAM_KEY_PREFIX}${chatId}`, streamId);
  } catch (error) {
    console.error("Failed to set active stream id", { chatId, streamId, error });
  }
}

export async function clearActiveStreamId(chatId: string, streamId: string) {
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
        arguments: [streamId],
      }
    );
  } catch (error) {
    console.error("Failed to clear active stream id", { chatId, streamId, error });
  }
}
