import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  afterMock,
  buildSessionCloseKeyMock,
  formatErrorMock,
  getChatBySlugForUserMock,
  getLatestSessionSummaryForChatMock,
  getMessagesByChatSlugForUserMock,
  logErrorMock,
  logWarnMock,
  markSessionCloseSeenMock,
  persistSessionSummaryForCompletedTurnMock,
} = vi.hoisted(() => ({
  afterMock: vi.fn(async (callback: () => Promise<void> | void) => {
    await callback();
  }),
  buildSessionCloseKeyMock: vi.fn(),
  formatErrorMock: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : String(error)
  ),
  getChatBySlugForUserMock: vi.fn(),
  getLatestSessionSummaryForChatMock: vi.fn(),
  getMessagesByChatSlugForUserMock: vi.fn(),
  logErrorMock: vi.fn(),
  logWarnMock: vi.fn(),
  markSessionCloseSeenMock: vi.fn(),
  persistSessionSummaryForCompletedTurnMock: vi.fn(),
}));

vi.mock("@avenire/database", () => ({
  getLatestSessionSummaryForChat: getLatestSessionSummaryForChatMock,
}));

vi.mock("@/lib/chat-data", () => ({
  getChatBySlugForUser: getChatBySlugForUserMock,
  getMessagesByChatSlugForUser: getMessagesByChatSlugForUserMock,
}));

vi.mock("@/lib/session-summaries", () => ({
  persistSessionSummaryForCompletedTurn:
    persistSessionSummaryForCompletedTurnMock,
}));

vi.mock("./chat-route-cache", () => ({
  buildSessionCloseKey: buildSessionCloseKeyMock,
  markSessionCloseSeen: markSessionCloseSeenMock,
}));

vi.mock("./chat-route-logging", () => ({
  formatError: formatErrorMock,
  logError: logErrorMock,
  logWarn: logWarnMock,
}));

vi.mock("next/server", async () => {
  const actual =
    await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: afterMock,
  };
});

import { handleSessionCloseChatRequest } from "./chat-route-session-close";

function createApiLoggerStub() {
  return {
    requestFailed: vi.fn(),
    requestSucceeded: vi.fn(),
  };
}

describe("chat route session close", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildSessionCloseKeyMock.mockReturnValue("close-key");
    markSessionCloseSeenMock.mockResolvedValue(true);
    getChatBySlugForUserMock.mockResolvedValue({
      id: "chat-db-1",
      lastMessageAt: "2026-05-18T00:00:00.000Z",
    });
    getMessagesByChatSlugForUserMock.mockResolvedValue([
      { id: "user-1", role: "user" },
      { id: "assistant-1", role: "assistant" },
    ]);
    getLatestSessionSummaryForChatMock.mockResolvedValue({ id: "summary-1" });
    persistSessionSummaryForCompletedTurnMock.mockResolvedValue(undefined);
  });

  it("ignores empty/new chat session-close requests", async () => {
    const apiLogger = createApiLoggerStub();

    const response = await handleSessionCloseChatRequest({
      apiLogger: apiLogger as never,
      chatId: "new",
      sessionId: "",
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ ok: true, ignored: true });
    expect(apiLogger.requestSucceeded).toHaveBeenCalledWith(
      202,
      expect.objectContaining({
        chatId: "new",
        ignored: true,
        kind: "session-close",
      })
    );
  });

  it("returns deduped when the session-close key was already seen", async () => {
    markSessionCloseSeenMock.mockResolvedValue(false);
    const apiLogger = createApiLoggerStub();

    const response = await handleSessionCloseChatRequest({
      apiLogger: apiLogger as never,
      chatId: "chat-1",
      sessionId: "session-1",
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ ok: true, deduped: true });
    expect(apiLogger.requestSucceeded).toHaveBeenCalledWith(
      202,
      expect.objectContaining({
        chatId: "chat-1",
        deduped: true,
        kind: "session-close",
      })
    );
  });

  it("returns 404 for missing chats and ignores empty message histories", async () => {
    const apiLogger = createApiLoggerStub();
    getChatBySlugForUserMock.mockResolvedValueOnce(null);

    const missingResponse = await handleSessionCloseChatRequest({
      apiLogger: apiLogger as never,
      chatId: "chat-404",
      sessionId: "session-1",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(missingResponse.status).toBe(404);
    await expect(missingResponse.json()).resolves.toEqual({
      error: "Chat not found",
    });

    getMessagesByChatSlugForUserMock.mockResolvedValueOnce([]);
    const emptyResponse = await handleSessionCloseChatRequest({
      apiLogger: apiLogger as never,
      chatId: "chat-1",
      sessionId: "session-1",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(emptyResponse.status).toBe(202);
    await expect(emptyResponse.json()).resolves.toEqual({
      ok: true,
      ignored: true,
    });
  });

  it("persists a forced session summary boundary and tolerates latest-summary lookup failures", async () => {
    getLatestSessionSummaryForChatMock.mockRejectedValueOnce(
      new Error("summary failed")
    );
    const apiLogger = createApiLoggerStub();

    const response = await handleSessionCloseChatRequest({
      apiLogger: apiLogger as never,
      chatId: "chat-1",
      sessionId: "session-1",
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(persistSessionSummaryForCompletedTurnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "chat-db-1",
        forceNewSessionBoundary: true,
        latestSummary: null,
        latestUserPosition: 0,
        userId: "user-1",
        workspaceId: "workspace-1",
      })
    );
    expect(logWarnMock).toHaveBeenCalledWith(
      "Failed to load latest session summary; continuing without it",
      expect.objectContaining({
        chatId: "chat-1",
        error: "summary failed",
      })
    );
  });
});
