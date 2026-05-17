import {
  createManagedRedisClient,
  ensureManagedRedisClient,
  isExpectedRedisConnectionError,
  type ManagedRedisClient,
} from "@/lib/redis-client";
import {
  getStreamKey,
  toPositiveInt,
  toWorkspaceEvent,
  type WorkspaceStreamEvent,
} from "@/lib/workspace-event-stream-model";

const DEFAULT_MAX_LEN = 5000;
const DEFAULT_BLOCK_MS = 15_000;

let publisher: ManagedRedisClient | null = null;

function getRedisUrl() {
  return process.env.REDIS_URL ?? "";
}

async function getPublisherClient() {
  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    throw new Error("REDIS_URL is not configured");
  }

  publisher = await ensureManagedRedisClient(
    publisher,
    redisUrl,
    "workspace-event-stream"
  );
  if (!publisher) {
    throw new Error("Redis publisher initialization failed");
  }

  return publisher;
}

export function hasWorkspaceEventStreamConfigured() {
  return Boolean(getRedisUrl());
}

export async function publishWorkspaceStreamEvent(input: {
  workspaceUuid: string;
  type: string;
  payload?: Record<string, unknown>;
  requestId?: string | null;
  ts?: number;
}) {
  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    return null;
  }

  let client: ManagedRedisClient;
  try {
    client = await getPublisherClient();
  } catch (error) {
    if (!isExpectedRedisConnectionError(error)) {
      console.error("Failed to initialize workspace stream publisher", {
        workspaceUuid: input.workspaceUuid,
        type: input.type,
        error,
      });
    }
    return null;
  }
  const maxLen = toPositiveInt(
    process.env.WORKSPACE_EVENTS_STREAM_MAXLEN,
    DEFAULT_MAX_LEN
  );
  const streamKey = getStreamKey(input.workspaceUuid);
  const ts = input.ts ?? Date.now();

  try {
    const streamId = await client.sendCommand<string>([
      "XADD",
      streamKey,
      "MAXLEN",
      "~",
      String(maxLen),
      "*",
      "type",
      input.type,
      "payload",
      JSON.stringify(input.payload ?? {}),
      "ts",
      String(ts),
      "requestId",
      input.requestId ?? "",
    ]);

    return {
      streamId,
      workspaceUuid: input.workspaceUuid,
      type: input.type,
      payload: input.payload ?? {},
      ts,
      requestId: input.requestId ?? null,
    } satisfies WorkspaceStreamEvent;
  } catch (error) {
    console.error("Failed to publish workspace stream event", {
      workspaceUuid: input.workspaceUuid,
      type: input.type,
      error,
    });
    return null;
  }
}

export async function listWorkspaceStreamEvents(input: {
  workspaceUuid: string;
  afterStreamId?: string | null;
  limit?: number;
}) {
  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    return [] as WorkspaceStreamEvent[];
  }

  let client: ManagedRedisClient;
  try {
    client = await getPublisherClient();
  } catch (error) {
    if (!isExpectedRedisConnectionError(error)) {
      console.error("Failed to initialize workspace stream publisher", {
        workspaceUuid: input.workspaceUuid,
        error,
      });
    }
    return [] as WorkspaceStreamEvent[];
  }
  const streamKey = getStreamKey(input.workspaceUuid);
  const limit = Math.min(500, Math.max(1, input.limit ?? 200));
  const start = input.afterStreamId ? `(${input.afterStreamId}` : "-";

  try {
    const rows = await client.sendCommand<unknown>([
      "XRANGE",
      streamKey,
      start,
      "+",
      "COUNT",
      String(limit),
    ]);

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows
      .map((row) => toWorkspaceEvent(input.workspaceUuid, row))
      .filter((event): event is WorkspaceStreamEvent => Boolean(event));
  } catch (error) {
    console.error("Failed to list workspace stream events", {
      workspaceUuid: input.workspaceUuid,
      error,
    });
    return [];
  }
}

export async function waitForWorkspaceStreamEvents(input: {
  workspaceUuid: string;
  afterStreamId?: string | null;
  limit?: number;
  blockMs?: number;
}) {
  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    return [] as WorkspaceStreamEvent[];
  }

  const streamKey = getStreamKey(input.workspaceUuid);
  const blockMs = Math.max(
    1000,
    toPositiveInt(
      process.env.WORKSPACE_EVENTS_STREAM_BLOCK_MS,
      DEFAULT_BLOCK_MS
    )
  );
  const limit = Math.min(200, Math.max(1, input.limit ?? 100));
  const after = input.afterStreamId ?? "$";
  const client = createManagedRedisClient(redisUrl, "workspace-event-stream");
  if (!(client.isOpen && client.isReady)) {
    try {
      await client.connect();
    } catch (error) {
      if (!isExpectedRedisConnectionError(error)) {
        console.error("Failed to connect workspace stream subscriber", {
          workspaceUuid: input.workspaceUuid,
          error,
        });
      }
      return [] as WorkspaceStreamEvent[];
    }
  }

  try {
    const rows = await client.sendCommand<unknown>([
      "XREAD",
      "BLOCK",
      String(input.blockMs ?? blockMs),
      "COUNT",
      String(limit),
      "STREAMS",
      streamKey,
      after,
    ]);

    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }

    const firstRow = rows[0];
    if (!Array.isArray(firstRow) || firstRow.length < 2) {
      return [];
    }

    const entries = firstRow[1];
    if (!Array.isArray(entries)) {
      return [];
    }

    return entries
      .map((entry) => toWorkspaceEvent(input.workspaceUuid, entry))
      .filter((event): event is WorkspaceStreamEvent => Boolean(event));
  } catch (error) {
    if (!isExpectedRedisConnectionError(error)) {
      console.error("Failed to wait for workspace stream events", {
        workspaceUuid: input.workspaceUuid,
        error,
      });
    }
    return [];
  } finally {
    try {
      await client.disconnect();
    } catch {
      // ignore
    }
  }
}
