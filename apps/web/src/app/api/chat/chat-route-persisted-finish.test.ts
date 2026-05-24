import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  clearActiveStreamIdMock,
  consumeChatUnitsMock,
  getActiveStreamIdMock,
  getLatestSessionSummaryForChatMock,
  getModelCreditMultiplierMock,
  invalidateChatReadCachesMock,
  isAbortLikeErrorMock,
  logErrorMock,
  logInfoMock,
  markIdempotencyDoneMock,
  persistSessionSummaryForCompletedTurnMock,
  resolveTotalTokensMock,
  getRequiredChatCreditsMock,
  getPersistedMessagesMock,
  saveMessagesForChatSlugMock,
} = vi.hoisted(() => ({
  clearActiveStreamIdMock: vi.fn(),
  consumeChatUnitsMock: vi.fn(),
  getActiveStreamIdMock: vi.fn(),
  getLatestSessionSummaryForChatMock: vi.fn(),
  getModelCreditMultiplierMock: vi.fn(),
  invalidateChatReadCachesMock: vi.fn(),
  isAbortLikeErrorMock: vi.fn(),
  logErrorMock: vi.fn(),
  logInfoMock: vi.fn(),
  markIdempotencyDoneMock: vi.fn(),
  persistSessionSummaryForCompletedTurnMock: vi.fn(),
  resolveTotalTokensMock: vi.fn(),
  getRequiredChatCreditsMock: vi.fn(),
  getPersistedMessagesMock: vi.fn(),
  saveMessagesForChatSlugMock: vi.fn(),
}));

vi.mock("@avenire/database", () => ({
  getLatestSessionSummaryForChat: getLatestSessionSummaryForChatMock,
  saveMessagesForChatSlug: saveMessagesForChatSlugMock,
}));

vi.mock("@/lib/billing-metering", () => ({
  consumeChatUnits: consumeChatUnitsMock,
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateChatReadCaches: invalidateChatReadCachesMock,
}));

vi.mock("@/lib/session-summary-runtime", () => ({
  persistSessionSummaryForCompletedTurn:
    persistSessionSummaryForCompletedTurnMock,
}));

vi.mock("./chat-route-cache", () => ({
  markIdempotencyDone: markIdempotencyDoneMock,
}));

vi.mock("./chat-route-logging", () => ({
  isAbortLikeError: isAbortLikeErrorMock,
  logError: logErrorMock,
  logInfo: logInfoMock,
}));

vi.mock("./chat-route-model", () => ({
  getPersistedMessages: getPersistedMessagesMock,
  getModelCreditMultiplier: getModelCreditMultiplierMock,
  getRequiredChatCredits: getRequiredChatCreditsMock,
  resolveTotalTokens: resolveTotalTokensMock,
}));

vi.mock("./chat-stream-store", () => ({
  clearActiveStreamId: clearActiveStreamIdMock,
  getActiveStreamId: getActiveStreamIdMock,
}));

import { handlePersistedChatStreamFinish } from "./chat-route-persisted-finish";

describe("chat route persisted finish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPersistedMessagesMock.mockReturnValue([
      { id: "user-1", role: "user" },
      { id: "assistant-1", role: "assistant" },
    ]);
    getActiveStreamIdMock.mockResolvedValue("stream-1");
    getLatestSessionSummaryForChatMock.mockResolvedValue({ id: "summary-1" });
    persistSessionSummaryForCompletedTurnMock.mockResolvedValue(undefined);
    resolveTotalTokensMock.mockReturnValue(2500);
    getModelCreditMultiplierMock.mockReturnValue(1);
    getRequiredChatCreditsMock.mockReturnValue(3);
    consumeChatUnitsMock.mockResolvedValue({ ok: true });
    isAbortLikeErrorMock.mockReturnValue(false);
  });

  it("persists messages, summaries, and metered usage for the active stream", async () => {
    const apiLogger = {
      featureUsed: vi.fn(),
      meter: vi.fn(),
    };

    await handlePersistedChatStreamFinish({
      apiLogger: apiLogger as never,
      chat: {
        id: "chat-db-1",
        lastMessageAt: "2026-05-17T12:00:00.000Z",
      } as never,
      chatSlug: "chat-1",
      idempotencyLockAcquired: true,
      idempotencyRedisKey: "idem-1",
      isContinuation: false,
      messages: [{ id: "assistant-1", role: "assistant" }] as never,
      originalMessages: [{ id: "user-1", role: "user" }] as never,
      requestStartedAt: new Date("2026-05-18T00:00:00.000Z"),
      responseMessage: { id: "assistant-1", role: "assistant" } as never,
      expectedCredits: 1,
      result: {
        totalUsage: Promise.resolve({
          inputTokens: 1500,
          outputTokens: 1000,
        }),
      },
      selectedModel: "apollo-apex",
      sessionUser: { id: "user-1" },
      streamId: "stream-1",
      workspace: { workspaceId: "workspace-1" },
    });

    expect(saveMessagesForChatSlugMock).toHaveBeenCalledWith(
      "user-1",
      "chat-1",
      getPersistedMessagesMock.mock.results[0]?.value,
      "workspace-1"
    );
    expect(invalidateChatReadCachesMock).toHaveBeenCalledWith("workspace-1");
    expect(persistSessionSummaryForCompletedTurnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "chat-db-1",
        latestUserPosition: 0,
        userId: "user-1",
        workspaceId: "workspace-1",
      })
    );
    expect(getRequiredChatCreditsMock).toHaveBeenCalledWith(
      2500,
      "apollo-apex"
    );
    expect(consumeChatUnitsMock).toHaveBeenCalledWith("user-1", 2);
    expect(apiLogger.meter).toHaveBeenCalledWith(
      "meter.chat.tokens",
      expect.objectContaining({
        chatId: "chat-1",
        creditMultiplier: 1,
        creditsCharged: 3,
        totalTokens: 2500,
      })
    );
    expect(clearActiveStreamIdMock).toHaveBeenCalledWith("chat-1", "stream-1");
    expect(markIdempotencyDoneMock).toHaveBeenCalledWith("idem-1", "chat-1");
  });

  it("keeps summary persistence, usage accounting, and cleanup running when chat cache invalidation fails", async () => {
    invalidateChatReadCachesMock.mockRejectedValueOnce(
      new Error("chat finish cache offline")
    );
    const apiLogger = {
      featureUsed: vi.fn(),
      meter: vi.fn(),
    };

    await handlePersistedChatStreamFinish({
      apiLogger: apiLogger as never,
      chat: {
        id: "chat-db-1",
        lastMessageAt: "2026-05-17T12:00:00.000Z",
      } as never,
      chatSlug: "chat-1",
      idempotencyLockAcquired: true,
      idempotencyRedisKey: "idem-1",
      isContinuation: false,
      messages: [{ id: "assistant-1", role: "assistant" }] as never,
      originalMessages: [{ id: "user-1", role: "user" }] as never,
      requestStartedAt: new Date("2026-05-18T00:00:00.000Z"),
      responseMessage: { id: "assistant-1", role: "assistant" } as never,
      expectedCredits: 1,
      result: {
        totalUsage: Promise.resolve({
          inputTokens: 1500,
          outputTokens: 1000,
        }),
      },
      selectedModel: "apollo-apex",
      sessionUser: { id: "user-1" },
      streamId: "stream-1",
      workspace: { workspaceId: "workspace-1" },
    });

    expect(invalidateChatReadCachesMock).toHaveBeenCalledWith("workspace-1");
    expect(logErrorMock).toHaveBeenCalledWith(
      "Failed to invalidate chat read caches after stream",
      expect.objectContaining({
        chatId: "chat-1",
        workspaceId: "workspace-1",
      })
    );
    expect(persistSessionSummaryForCompletedTurnMock).toHaveBeenCalled();
    expect(consumeChatUnitsMock).toHaveBeenCalledWith("user-1", 2);
    expect(clearActiveStreamIdMock).toHaveBeenCalledWith("chat-1", "stream-1");
    expect(markIdempotencyDoneMock).toHaveBeenCalledWith("idem-1", "chat-1");
  });

  it("skips stale streams but still clears active stream state and idempotency markers", async () => {
    getActiveStreamIdMock.mockResolvedValue("different-stream");
    const apiLogger = {
      featureUsed: vi.fn(),
      meter: vi.fn(),
    };

    await handlePersistedChatStreamFinish({
      apiLogger: apiLogger as never,
      chat: { id: "chat-db-1", lastMessageAt: null } as never,
      chatSlug: "chat-2",
      idempotencyLockAcquired: true,
      idempotencyRedisKey: "idem-2",
      isContinuation: false,
      messages: [{ id: "assistant-1", role: "assistant" }] as never,
      originalMessages: [{ id: "user-1", role: "user" }] as never,
      requestStartedAt: new Date("2026-05-18T00:00:00.000Z"),
      responseMessage: { id: "assistant-1", role: "assistant" } as never,
      expectedCredits: 1,
      result: {
        totalUsage: Promise.resolve({ totalTokens: 1000 }),
      },
      selectedModel: "apollo-apex",
      sessionUser: { id: "user-1" },
      streamId: "stream-1",
      workspace: { workspaceId: "workspace-1" },
    });

    expect(saveMessagesForChatSlugMock).not.toHaveBeenCalled();
    expect(clearActiveStreamIdMock).toHaveBeenCalledWith("chat-2", "stream-1");
    expect(markIdempotencyDoneMock).toHaveBeenCalledWith("idem-2", "chat-2");
  });

  it("keeps idempotency completion running when stream cleanup fails in finally", async () => {
    clearActiveStreamIdMock.mockRejectedValueOnce(
      new Error("finish cleanup offline")
    );
    const apiLogger = {
      featureUsed: vi.fn(),
      meter: vi.fn(),
    };

    await handlePersistedChatStreamFinish({
      apiLogger: apiLogger as never,
      chat: {
        id: "chat-db-1",
        lastMessageAt: "2026-05-17T12:00:00.000Z",
      } as never,
      chatSlug: "chat-1",
      idempotencyLockAcquired: true,
      idempotencyRedisKey: "idem-1",
      isContinuation: false,
      messages: [{ id: "assistant-1", role: "assistant" }] as never,
      originalMessages: [{ id: "user-1", role: "user" }] as never,
      requestStartedAt: new Date("2026-05-18T00:00:00.000Z"),
      responseMessage: { id: "assistant-1", role: "assistant" } as never,
      expectedCredits: 1,
      result: {
        totalUsage: Promise.resolve({
          inputTokens: 1500,
          outputTokens: 1000,
        }),
      },
      selectedModel: "apollo-apex",
      sessionUser: { id: "user-1" },
      streamId: "stream-1",
      workspace: { workspaceId: "workspace-1" },
    });

    expect(logErrorMock).toHaveBeenCalledWith(
      "Failed to clear active stream id after finish",
      expect.objectContaining({
        chatId: "chat-1",
      })
    );
    expect(markIdempotencyDoneMock).toHaveBeenCalledWith("idem-1", "chat-1");
  });
});
