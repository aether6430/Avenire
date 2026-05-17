import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  buildPromptMemoryBlocksMock,
  buildStudentProfileContextMock,
  getActiveMisconceptionContextMock,
  getRedisClientMock,
  isPromptMemoryBlockArrayMock,
  redisDelMock,
  redisGetMock,
  redisSetMock,
} = vi.hoisted(() => ({
  buildPromptMemoryBlocksMock: vi.fn(),
  buildStudentProfileContextMock: vi.fn(),
  getActiveMisconceptionContextMock: vi.fn(),
  getRedisClientMock: vi.fn(),
  isPromptMemoryBlockArrayMock: vi.fn(),
  redisDelMock: vi.fn(),
  redisGetMock: vi.fn(),
  redisSetMock: vi.fn(),
}));

vi.mock("@/lib/chat-tools", () => ({
  getActiveMisconceptionContext: getActiveMisconceptionContextMock,
}));

vi.mock("@/lib/student-profile", () => ({
  buildStudentProfileContext: buildStudentProfileContextMock,
}));

vi.mock("./chat-route-model", () => ({
  buildPromptMemoryBlocks: buildPromptMemoryBlocksMock,
  isPromptMemoryBlockArray: isPromptMemoryBlockArrayMock,
}));

vi.mock("./chat-stream-store", () => ({
  getRedisClient: getRedisClientMock,
}));

function createRedisClient() {
  return {
    del: redisDelMock,
    get: redisGetMock,
    set: redisSetMock,
  };
}

async function importCache() {
  return import("@/app/api/chat/chat-route-cache");
}

describe("chat route cache", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T12:00:00.000Z"));
    buildPromptMemoryBlocksMock.mockReset();
    buildStudentProfileContextMock.mockReset();
    getActiveMisconceptionContextMock.mockReset();
    getRedisClientMock.mockReset();
    isPromptMemoryBlockArrayMock.mockReset();
    redisDelMock.mockReset();
    redisGetMock.mockReset();
    redisSetMock.mockReset();

    getRedisClientMock.mockResolvedValue(createRedisClient());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("builds stable session-close and idempotency keys", async () => {
    const cache = await importCache();

    expect(
      cache.buildSessionCloseKey({
        chatId: "chat-1",
        sessionId: "session-1",
        userId: "user-1",
        workspaceId: "workspace-1",
      })
    ).toBe("chat:session-close:user-1workspace-1chat-1session-1");

    const key = cache.buildChatIdempotencyRedisKey({
      chatSlug: "new",
      idempotencyKey: "idem-1",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(key).toMatch(/^chat:idempotency:[a-f0-9]{64}$/);
    expect(
      cache.buildChatIdempotencyRedisKey({
        chatSlug: "new",
        idempotencyKey: "idem-1",
        userId: "user-1",
        workspaceId: "workspace-1",
      })
    ).toBe(key);
  });

  it("marks session-close seen via redis but fails open when redis errors", async () => {
    const cache = await importCache();

    redisSetMock.mockResolvedValueOnce("OK");
    await expect(cache.markSessionCloseSeen("close-key")).resolves.toBe(true);
    expect(redisSetMock).toHaveBeenCalledWith("close-key", "1", {
      EX: 86_400,
      NX: true,
    });

    redisSetMock.mockRejectedValueOnce(new Error("redis failed"));
    await expect(cache.markSessionCloseSeen("close-key")).resolves.toBe(true);
  });

  it("computes learning prompt memory blocks once and then serves them from the process cache", async () => {
    const cache = await importCache();
    const blocks = [{ content: "Memory", kind: "subject" }];
    redisGetMock.mockResolvedValueOnce(null);
    buildStudentProfileContextMock.mockResolvedValue("Profile");
    getActiveMisconceptionContextMock.mockResolvedValue("Misconception");
    buildPromptMemoryBlocksMock.mockReturnValue(blocks);

    const first = await cache.getCachedLearningPromptMemoryBlocks({
      recentSummaryContext: "Recent summary",
      recentSummaryUpdatedAt: "2026-05-18T10:00:00.000Z",
      subject: "Physics",
      topic: "Torque",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    const second = await cache.getCachedLearningPromptMemoryBlocks({
      recentSummaryContext: "Recent summary",
      recentSummaryUpdatedAt: "2026-05-18T10:00:00.000Z",
      subject: "Physics",
      topic: "Torque",
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(first).toBe(blocks);
    expect(second).toBe(blocks);
    expect(getActiveMisconceptionContextMock).toHaveBeenCalledTimes(1);
    expect(buildStudentProfileContextMock).toHaveBeenCalledTimes(1);
    expect(buildPromptMemoryBlocksMock).toHaveBeenCalledWith({
      misconceptionsContext: "Misconception",
      sessionSummaryContext: "Recent summary",
      studentProfileContext: "Profile",
      subject: "Physics",
      topic: "Torque",
    });
    expect(redisSetMock).toHaveBeenCalledWith(
      "chat-learning-context:v1::user-1:workspace-1:Physics:Torque:2026-05-18T10:00:00.000Z",
      JSON.stringify(blocks),
      { EX: 10_800 }
    );
  });

  it("uses a valid redis learning-context cache payload when available", async () => {
    const cache = await importCache();
    const cachedBlocks = [{ content: "Cached", kind: "subject" }];
    redisGetMock.mockResolvedValue(JSON.stringify(cachedBlocks));
    isPromptMemoryBlockArrayMock.mockReturnValue(true);

    const result = await cache.getCachedLearningPromptMemoryBlocks({
      recentSummaryContext: "Recent summary",
      recentSummaryUpdatedAt: null,
      subject: "Physics",
      topic: null,
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(result).toEqual(cachedBlocks);
    expect(buildPromptMemoryBlocksMock).not.toHaveBeenCalled();
    expect(getActiveMisconceptionContextMock).not.toHaveBeenCalled();
  });

  it("handles idempotency lock/state helpers and cleanup conservatively", async () => {
    const cache = await importCache();

    redisSetMock.mockResolvedValueOnce("OK");
    await expect(cache.tryAcquireIdempotencyLock("idem-key")).resolves.toBe(
      true
    );
    expect(redisSetMock).toHaveBeenCalledWith(
      "idem-key",
      JSON.stringify({ status: "in_progress", ts: Date.now() }),
      { EX: 180, NX: true }
    );

    redisGetMock.mockResolvedValueOnce("cached-state");
    await expect(cache.getIdempotencyState("idem-key")).resolves.toBe(
      "cached-state"
    );

    await cache.markIdempotencyDone("idem-key", "chat-1");
    expect(redisSetMock).toHaveBeenLastCalledWith(
      "idem-key",
      JSON.stringify({ status: "done", chatSlug: "chat-1", ts: Date.now() }),
      { EX: 600 }
    );

    await cache.clearIdempotencyKey("idem-key");
    expect(redisDelMock).toHaveBeenCalledWith("idem-key");

    getRedisClientMock.mockRejectedValueOnce(new Error("redis failed"));
    await expect(cache.tryAcquireIdempotencyLock("idem-key-2")).resolves.toBe(
      true
    );
    getRedisClientMock.mockRejectedValueOnce(new Error("redis failed"));
    await expect(cache.getIdempotencyState("idem-key-2")).resolves.toBeNull();
  });
});
