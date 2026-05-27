import {
  createManagedRedisClient,
  ensureManagedRedisClient,
  isExpectedRedisConnectionError,
  type ManagedRedisClient,
} from "@/lib/redis-client";
import { publishWorkspaceStreamEvent } from "./workspace-event-stream";

export type FilesInvalidationReason =
  | "file.created"
  | "file.updated"
  | "file.deleted"
  | "folder.created"
  | "folder.updated"
  | "folder.deleted"
  | "tree.changed";

interface FilesInvalidationPayload {
  at?: number;
  fileId?: string;
  folderId?: string;
  reason: FilesInvalidationReason;
  workspaceUuid: string;
}

const redisUrl = process.env.REDIS_URL;
type PublisherClient = ManagedRedisClient;

let publisher: PublisherClient | null = null;
let publisherInitPromise: Promise<PublisherClient> | null = null;

function workspaceChannel(workspaceUuid: string) {
  return `files:workspace:${workspaceUuid}`;
}

async function getPublisher() {
  if (!redisUrl) {
    throw new Error("REDIS_URL is not configured");
  }

  if (!(publisher || publisherInitPromise)) {
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

export async function publishFilesInvalidationEvent(
  payload: FilesInvalidationPayload
) {
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
        fileId: payload.fileId,
        reason: payload.reason,
        workspaceUuid: payload.workspaceUuid,
      })
    );

    const eventPayload = {
      at: payload.at ?? Date.now(),
      folderId: payload.folderId ?? null,
      fileId: payload.fileId ?? null,
      reason: payload.reason,
      workspaceUuid: payload.workspaceUuid,
    };

    await Promise.all([
      publishWorkspaceStreamEvent({
        workspaceUuid: payload.workspaceUuid,
        type: "files.invalidate",
        payload: eventPayload,
      }),
      publishWorkspaceStreamEvent({
        workspaceUuid: payload.workspaceUuid,
        type: payload.reason,
        payload: eventPayload,
      }),
    ]);
  } catch (error) {
    console.error("Failed to publish files invalidation event", {
      payload,
      error,
    });
  }
}
