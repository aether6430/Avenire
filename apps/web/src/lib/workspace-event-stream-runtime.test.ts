import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.REDIS_URL = "redis://localhost:6379";

const {
  connectMock,
  createManagedRedisClientMock,
  disconnectMock,
  ensureManagedRedisClientMock,
  isExpectedRedisConnectionErrorMock,
  sendCommandMock,
} = vi.hoisted(() => ({
  connectMock: vi.fn(),
  createManagedRedisClientMock: vi.fn(),
  disconnectMock: vi.fn(),
  ensureManagedRedisClientMock: vi.fn(),
  isExpectedRedisConnectionErrorMock: vi.fn(),
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
