import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  clearActiveStreamIdMock,
  consumeChatUnitsMock,
  getActiveStreamIdMock,
  getLatestSessionSummaryForChatMock,
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
}));

vi.mock("@/lib/billing-metering", () => ({
  consumeChatUnits: consumeChatUnitsMock,
}));

vi.mock("@/lib/chat-data", () => ({
  saveMessagesForChatSlug: saveMessagesForChatSlugMock,
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateChatReadCaches: invalidateChatReadCachesMock,
}));

vi.mock("@/lib/session-summaries", () => ({
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
    expect(consumeChatUnitsMock).toHaveBeenCalledWith("user-1", 2);
    expect(apiLogger.meter).toHaveBeenCalledWith(
      "meter.chat.tokens",
      expect.objectContaining({
        chatId: "chat-1",
        creditsCharged: 3,
        totalTokens: 2500,
      })
    );
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
});
