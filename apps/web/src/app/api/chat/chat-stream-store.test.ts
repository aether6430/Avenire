import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { ensureManagedRedisClientMock, evalMock, getMock, setMock } = vi.hoisted(
  () => ({
    ensureManagedRedisClientMock: vi.fn(),
    evalMock: vi.fn(),
    getMock: vi.fn(),
    setMock: vi.fn(),
  })
);

vi.mock("@/lib/redis-client", () => ({
  ensureManagedRedisClient: ensureManagedRedisClientMock,
}));

function createClient() {
  return {
    eval: evalMock,
    get: getMock,
    set: setMock,
  };
}

async function importStore() {
  return import("@/app/api/chat/chat-stream-store");
}

describe("chat stream store", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    ensureManagedRedisClientMock.mockReset();
    evalMock.mockReset();
    getMock.mockReset();
    setMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed when redis is not configured", async () => {
    vi.stubEnv("REDIS_URL", "");
    const store = await importStore();

    expect(store.hasChatStreamStoreConfig()).toBe(false);
    await expect(store.getRedisClient()).rejects.toThrow(
      "REDIS_URL is not configured"
    );
    await expect(store.getRedisSubscriber()).rejects.toThrow(
      "REDIS_URL is not configured"
    );
    await expect(store.getActiveStreamId("chat-1")).resolves.toBeNull();
    await expect(store.setActiveStreamId("chat-1", "stream-1")).resolves.toBe(
      undefined
    );
    await expect(
      store.clearActiveStreamId("chat-1", "stream-1")
    ).resolves.toBeUndefined();
  });

  it("initializes and reuses redis clients when configured", async () => {
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    const client = createClient();
    ensureManagedRedisClientMock.mockResolvedValue(client);
    const store = await importStore();

    await expect(store.getRedisClient()).resolves.toBe(client);
    await expect(store.getRedisClient()).resolves.toBe(client);
    await expect(store.getRedisSubscriber()).resolves.toBe(client);

    expect(ensureManagedRedisClientMock).toHaveBeenNthCalledWith(
      1,
      null,
      "redis://localhost:6379",
      "chat-stream-store"
    );
    expect(ensureManagedRedisClientMock).toHaveBeenNthCalledWith(
      2,
      client,
      "redis://localhost:6379",
      "chat-stream-store"
    );
  });

  it("reads, writes, and conditionally clears active stream ids through redis", async () => {
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    const client = createClient();
    ensureManagedRedisClientMock.mockResolvedValue(client);
    getMock.mockResolvedValue("stream-1");
    const store = await importStore();

    await expect(store.getActiveStreamId("chat-1")).resolves.toBe("stream-1");
    await store.setActiveStreamId("chat-1", "stream-2");
    await store.clearActiveStreamId("chat-1", "stream-2");

    expect(getMock).toHaveBeenCalledWith("chat-active-stream:chat-1");
    expect(setMock).toHaveBeenCalledWith(
      "chat-active-stream:chat-1",
      "stream-2"
    );
    expect(evalMock).toHaveBeenCalledWith(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0",
      {
        arguments: ["stream-2"],
        keys: ["chat-active-stream:chat-1"],
      }
    );
  });

  it("returns null or no-ops when redis operations fail after configuration", async () => {
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    const client = createClient();
    ensureManagedRedisClientMock.mockResolvedValue(client);
    getMock.mockRejectedValue(new Error("read failed"));
    setMock.mockRejectedValue(new Error("write failed"));
    evalMock.mockRejectedValue(new Error("clear failed"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const store = await importStore();

    await expect(store.getActiveStreamId("chat-2")).resolves.toBeNull();
    await expect(store.setActiveStreamId("chat-2", "stream-3")).resolves.toBe(
      undefined
    );
    await expect(
      store.clearActiveStreamId("chat-2", "stream-3")
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to read active stream id",
      expect.objectContaining({ chatId: "chat-2" })
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to set active stream id",
      expect.objectContaining({ chatId: "chat-2", streamId: "stream-3" })
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to clear active stream id",
      expect.objectContaining({ chatId: "chat-2", streamId: "stream-3" })
    );
  });

  it("throws if redis client initialization returns null despite configuration", async () => {
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    ensureManagedRedisClientMock.mockResolvedValue(null);
    const store = await importStore();

    await expect(store.getRedisClient()).rejects.toThrow(
      "Redis client initialization failed"
    );
    await expect(store.getRedisSubscriber()).rejects.toThrow(
      "Redis subscriber initialization failed"
    );
  });
});
