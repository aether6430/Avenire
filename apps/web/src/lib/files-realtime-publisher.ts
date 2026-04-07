import type { RedisClientType } from "redis";
import { publishWorkspaceStreamEvent } from "./workspace-event-stream";
import {
  createManagedRedisClient,
  ensureManagedRedisClient,
  isExpectedRedisConnectionError,
} from "@/lib/redis-client";

export type FilesInvalidationReason =
  | "file.created"
  | "file.updated"
  | "file.deleted"
  | "folder.created"
  | "folder.updated"
  | "folder.deleted"
  | "tree.changed";

interface FilesInvalidationPayload {
  workspaceUuid: string;
  folderId?: string;
  reason: FilesInvalidationReason;
  at?: number;
}

const redisUrl = process.env.REDIS_URL;
type PublisherClient = RedisClientType;

let publisher: PublisherClient | null = null;
let publisherInitPromise: Promise<PublisherClient> | null = null;

function workspaceChannel(workspaceUuid: string) {
  return `files:workspace:${workspaceUuid}`;
}

async function getPublisher() {
  if (!redisUrl) {
    throw new Error("REDIS_URL is not configured");
  }

  if (!publisher && !publisherInitPromise) {
    publisherInitPromise = (async () => {
      const client = createManagedRedisClient(
        redisUrl,
        "files-realtime-publisher"
      );
      const connected = await ensureManagedRedisClient(
        client,
        redisUrl,
        "files-realtime-publisher"
      );
      if (!connected) {
        throw new Error("Redis publisher initialization failed");
      }
      publisher = connected;
      return connected;
    })().catch((error) => {
      publisherInitPromise = null;
      throw error;
    });
  }

  if (publisherInitPromise) {
    const client = await publisherInitPromise;
    if (!publisher) {
      publisher = client;
    }
    publisherInitPromise = null;
  }

  if (!publisher) {
    throw new Error("Redis publisher initialization failed");
  }

  return publisher;
}

export function hasFilesRealtimeConfigured() {
  return Boolean(redisUrl && process.env.SSE_TOKEN_SECRET);
}

export async function createFilesRealtimeSubscriber(workspaceUuid: string) {
  const base = await getPublisher();
  const subscriber = base.duplicate();

  subscriber.on("error", (error) => {
    if (isExpectedRedisConnectionError(error)) {
      return;
    }
    console.error("Redis subscriber error in files-realtime-publisher", error);
  });

  await subscriber.connect();
  return { channel: workspaceChannel(workspaceUuid), subscriber };
}

export async function publishFilesInvalidationEvent(payload: FilesInvalidationPayload) {
  if (!redisUrl) {
    return;
  }

  try {
    const client = await getPublisher();
    await client.publish(
      workspaceChannel(payload.workspaceUuid),
      JSON.stringify({
        at: payload.at ?? Date.now(),
        folderId: payload.folderId,
        reason: payload.reason,
        workspaceUuid: payload.workspaceUuid,
      }),
    );

    await publishWorkspaceStreamEvent({
      workspaceUuid: payload.workspaceUuid,
      type: "files.invalidate",
      payload: {
        at: payload.at ?? Date.now(),
        folderId: payload.folderId ?? null,
        reason: payload.reason,
        workspaceUuid: payload.workspaceUuid,
      },
    });
  } catch (error) {
    console.error("Failed to publish files invalidation event", { payload, error });
  }
}
