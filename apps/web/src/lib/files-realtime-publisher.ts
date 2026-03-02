import { createClient, type RedisClientType } from "redis";

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
let publisher: RedisClientType | null = null;

function workspaceChannel(workspaceUuid: string) {
  return `files:workspace:${workspaceUuid}`;
}

async function getPublisher() {
  if (!redisUrl) {
    throw new Error("REDIS_URL is not configured");
  }

  if (!publisher) {
    publisher = createClient({ url: redisUrl });
    publisher.on("error", (error) => {
      console.error("Redis publisher error in files-realtime-publisher", error);
    });
  }

  if (!publisher.isOpen) {
    await publisher.connect();
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
  } catch (error) {
    console.error("Failed to publish files invalidation event", { payload, error });
  }
}
