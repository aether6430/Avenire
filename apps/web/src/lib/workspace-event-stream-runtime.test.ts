import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.REDIS_URL = "redis://localhost:6379";

const webRedisClientSource = readFileSync(
  resolve(import.meta.dirname, "./redis-client.ts"),
  "utf8"
);
const workspaceEventStreamBarrelSource = readFileSync(
  resolve(import.meta.dirname, "./workspace-event-stream.ts"),
  "utf8"
);
const workspaceEventStreamModelSource = readFileSync(
  resolve(import.meta.dirname, "./workspace-event-stream-model.ts"),
  "utf8"
);
const workspaceEventStreamRuntimeSource = readFileSync(
  resolve(import.meta.dirname, "./workspace-event-stream-runtime.ts"),
  "utf8"
);

const {
  connectMock,
  createManagedRedisClientMock,
  disconnectMock,
  ensureManagedRedisClientMock,
  isExpectedRedisConnectionErrorMock,
  publishWorkspaceStreamEventMock,
  sendCommandMock,
} = vi.hoisted(() => ({
  connectMock: vi.fn(),
  createManagedRedisClientMock: vi.fn(),
  disconnectMock: vi.fn(),
  ensureManagedRedisClientMock: vi.fn(),
  isExpectedRedisConnectionErrorMock: vi.fn(),
  publishWorkspaceStreamEventMock: vi.fn(),
  sendCommandMock: vi.fn(),
}));

vi.mock("@/lib/redis-client", () => ({
  createManagedRedisClient: createManagedRedisClientMock,
  ensureManagedRedisClient: ensureManagedRedisClientMock,
  isExpectedRedisConnectionError: isExpectedRedisConnectionErrorMock,
}));

import {
  hasWorkspaceEventStreamConfigured,
  listWorkspaceStreamEvents,
  publishWorkspaceStreamEvent,
  waitForWorkspaceStreamEvents,
} from "@/lib/workspace-event-stream-runtime";

describe("workspace event stream runtime", () => {
  beforeEach(() => {
    connectMock.mockReset();
    createManagedRedisClientMock.mockReset();
    disconnectMock.mockReset();
    ensureManagedRedisClientMock.mockReset();
    isExpectedRedisConnectionErrorMock.mockReset();
    publishWorkspaceStreamEventMock.mockReset();
    sendCommandMock.mockReset();

    ensureManagedRedisClientMock.mockResolvedValue({
      sendCommand: sendCommandMock,
    });
    createManagedRedisClientMock.mockReturnValue({
      connect: connectMock,
      disconnect: disconnectMock,
      isOpen: false,
      isReady: false,
      sendCommand: sendCommandMock,
    });
    isExpectedRedisConnectionErrorMock.mockReturnValue(false);
  });

  it("reports whether the stream is configured", () => {
    expect(hasWorkspaceEventStreamConfigured()).toBe(true);
  });

  it("reuses the shared ingestion redis url normalizer instead of redefining one locally", () => {
    expect(webRedisClientSource).toContain(
      'from "@avenire/ingestion/runtime/redis-client"'
    );
    expect(webRedisClientSource).not.toContain("function normalizeRedisUrl(");
  });

  it("keeps workspace event streams split between a thin barrel, pure event parsing model, and redis runtime", () => {
    expect(workspaceEventStreamBarrelSource).toContain(
      "@/lib/workspace-event-stream-model"
    );
    expect(workspaceEventStreamBarrelSource).toContain(
      "@/lib/workspace-event-stream-runtime"
    );
    expect(workspaceEventStreamBarrelSource).not.toContain(
      "createManagedRedisClient("
    );
    expect(workspaceEventStreamBarrelSource).not.toContain("sendCommand(");

    expect(workspaceEventStreamModelSource).toContain(
      "export function getStreamKey"
    );
    expect(workspaceEventStreamModelSource).toContain(
      "export function toWorkspaceEvent"
    );
    expect(workspaceEventStreamModelSource).not.toContain("sendCommand(");
    expect(workspaceEventStreamModelSource).not.toContain(
      "createManagedRedisClient("
    );

    expect(workspaceEventStreamRuntimeSource).toContain(
      "createManagedRedisClient"
    );
    expect(workspaceEventStreamRuntimeSource).toContain(
      "ensureManagedRedisClient"
    );
    expect(workspaceEventStreamRuntimeSource).toContain("client.sendCommand");
    expect(workspaceEventStreamRuntimeSource).toContain("toWorkspaceEvent");
    expect(workspaceEventStreamRuntimeSource).toContain("getStreamKey");
  });

  it("publishes workspace events to redis streams", async () => {
    sendCommandMock.mockResolvedValue("1716650000-0");

    const event = await publishWorkspaceStreamEvent({
      payload: { fileId: "file-1" },
      requestId: "req-1",
      ts: 123,
      type: "file.updated",
      workspaceUuid: "workspace-1",
    });

    expect(sendCommandMock).toHaveBeenCalled();
    expect(event).toMatchObject({
      requestId: "req-1",
      streamId: "1716650000-0",
      type: "file.updated",
      workspaceUuid: "workspace-1",
    });
  });

  it("fans out files invalidation events into both generic and reason-specific workspace stream events", async () => {
    vi.resetModules();

    const publishMock = vi.fn().mockResolvedValue(1);
    const filesPublisherClient = {
      connect: connectMock,
      duplicate: vi.fn(),
      isOpen: false,
      isReady: false,
      on: vi.fn(),
      publish: publishMock,
    };

    createManagedRedisClientMock.mockReturnValue(filesPublisherClient as never);
    ensureManagedRedisClientMock.mockResolvedValue(
      filesPublisherClient as never
    );
    publishWorkspaceStreamEventMock.mockResolvedValue(null);

    vi.doMock("@/lib/workspace-event-stream", () => ({
      publishWorkspaceStreamEvent: publishWorkspaceStreamEventMock,
    }));

    const { publishFilesInvalidationEvent } = await import(
      "@/lib/files-realtime-publisher"
    );

    await publishFilesInvalidationEvent({
      fileId: "file-1",
      reason: "file.deleted",
      workspaceUuid: "workspace-1",
    });

    const publishArgs = publishMock.mock.calls[0];
    expect(publishArgs?.[0]).toBe("files:workspace:workspace-1");
    expect(JSON.parse(String(publishArgs?.[1]))).toEqual({
      at: expect.any(Number),
      fileId: "file-1",
      reason: "file.deleted",
      workspaceUuid: "workspace-1",
    });
    expect(publishWorkspaceStreamEventMock).toHaveBeenNthCalledWith(1, {
      workspaceUuid: "workspace-1",
      type: "files.invalidate",
      payload: {
        at: expect.any(Number),
        fileId: "file-1",
        folderId: null,
        reason: "file.deleted",
        workspaceUuid: "workspace-1",
      },
    });
    expect(publishWorkspaceStreamEventMock).toHaveBeenNthCalledWith(2, {
      workspaceUuid: "workspace-1",
      type: "file.deleted",
      payload: {
        at: expect.any(Number),
        fileId: "file-1",
        folderId: null,
        reason: "file.deleted",
        workspaceUuid: "workspace-1",
      },
    });
  });

  it("lists stream events from redis ranges", async () => {
    sendCommandMock.mockResolvedValue([
      [
        "1716650000-0",
        ["type", "file.updated", "payload", '{"fileId":"file-1"}', "ts", "1"],
      ],
    ]);

    const events = await listWorkspaceStreamEvents({
      workspaceUuid: "workspace-1",
    });

    expect(events[0]).toMatchObject({
      payload: { fileId: "file-1" },
      type: "file.updated",
    });
  });

  it("waits for stream events through a dedicated subscriber connection", async () => {
    sendCommandMock.mockResolvedValue([
      [
        "workspace:events:workspace-1",
        [
          [
            "1716650000-0",
            [
              "type",
              "file.updated",
              "payload",
              '{"fileId":"file-1"}',
              "ts",
              "1",
            ],
          ],
        ],
      ],
    ]);

    const events = await waitForWorkspaceStreamEvents({
      afterStreamId: "$",
      workspaceUuid: "workspace-1",
    });

    expect(connectMock).toHaveBeenCalled();
    expect(disconnectMock).toHaveBeenCalled();
    expect(events[0]).toMatchObject({
      payload: { fileId: "file-1" },
      type: "file.updated",
    });
  });
});
