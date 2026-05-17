import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  buildPersistedChatStreamResponseMock,
  buildChatIdempotencyRedisKeyMock,
  clearIdempotencyKeyMock,
  consumeChatUnitsMock,
  createChatForUserMock,
  formatErrorMock,
  getChatBySlugForUserMock,
  getIdempotencyStateMock,
  invalidateChatReadCachesMock,
  isChatOwnerForUserMock,
  loadPersistedChatStartupContextMock,
  logErrorMock,
  logInfoMock,
  saveMessagesForChatSlugMock,
  tryAcquireIdempotencyLockMock,
} = vi.hoisted(() => ({
  buildPersistedChatStreamResponseMock: vi.fn(),
  buildChatIdempotencyRedisKeyMock: vi.fn(),
  clearIdempotencyKeyMock: vi.fn(),
  consumeChatUnitsMock: vi.fn(),
  createChatForUserMock: vi.fn(),
  formatErrorMock: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : String(error)
  ),
  getChatBySlugForUserMock: vi.fn(),
  getIdempotencyStateMock: vi.fn(),
  invalidateChatReadCachesMock: vi.fn(),
  isChatOwnerForUserMock: vi.fn(),
  loadPersistedChatStartupContextMock: vi.fn(),
  logErrorMock: vi.fn(),
  logInfoMock: vi.fn(),
  saveMessagesForChatSlugMock: vi.fn(),
  tryAcquireIdempotencyLockMock: vi.fn(),
}));

vi.mock("@/lib/billing-metering", () => ({
  consumeChatUnits: consumeChatUnitsMock,
}));

vi.mock("@/lib/chat-data", () => ({
  createChatForUser: createChatForUserMock,
  getChatBySlugForUser: getChatBySlugForUserMock,
  isChatOwnerForUser: isChatOwnerForUserMock,
  saveMessagesForChatSlug: saveMessagesForChatSlugMock,
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateChatReadCaches: invalidateChatReadCachesMock,
}));

vi.mock("./chat-route-cache", () => ({
  buildChatIdempotencyRedisKey: buildChatIdempotencyRedisKeyMock,
  clearIdempotencyKey: clearIdempotencyKeyMock,
  getIdempotencyState: getIdempotencyStateMock,
  tryAcquireIdempotencyLock: tryAcquireIdempotencyLockMock,
}));

vi.mock("./chat-route-logging", () => ({
  formatError: formatErrorMock,
  logError: logErrorMock,
  logInfo: logInfoMock,
}));

vi.mock("./chat-route-persisted-context", () => ({
  loadPersistedChatStartupContext: loadPersistedChatStartupContextMock,
}));

vi.mock("./chat-route-persisted-stream", () => ({
  buildPersistedChatStreamResponse: buildPersistedChatStreamResponseMock,
}));

import { handlePersistedChatRequest } from "./chat-route-persisted";

function createApiLoggerStub() {
  return {
    rateLimited: vi.fn(),
    requestFailed: vi.fn(),
  };
}

function createRequest(body: Record<string, unknown>, idempotencyKey?: string) {
  const headers = new Headers();
  if (idempotencyKey) {
    headers.set("idempotency-key", idempotencyKey);
  }
  return new Request("http://localhost/api/chat", {
    body: JSON.stringify(body),
    headers,
    method: "POST",
  });
}

describe("chat route persisted request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildChatIdempotencyRedisKeyMock.mockReturnValue("idem-1");
    getIdempotencyStateMock.mockResolvedValue(null);
    tryAcquireIdempotencyLockMock.mockResolvedValue(true);
    createChatForUserMock.mockResolvedValue({
      id: "chat-db-1",
      slug: "chat-1",
      title: "New Method",
    });
    consumeChatUnitsMock.mockResolvedValue({
      ok: true,
      retryAfter: null,
    });
    loadPersistedChatStartupContextMock.mockResolvedValue({
      latestUserText: "Explain torque",
      recentRelevantSummary: null,
      resolvedSubject: "Physics",
      resolvedTopic: "Torque",
      workspaceSubjectSummary: null,
    });
    buildPersistedChatStreamResponseMock.mockResolvedValue(
      new Response("ok", { status: 200 })
    );
  });

  it("returns a duplicate-request 409 when the idempotency key is already consumed for a new chat", async () => {
    getIdempotencyStateMock.mockResolvedValue({ status: "done" });
    const apiLogger = createApiLoggerStub();

    const response = await handlePersistedChatRequest({
      apiLogger: apiLogger as never,
      body: {
        chatId: "new",
        messages: [],
      },
      request: createRequest({ chatId: "new", messages: [] }, "idem-key"),
      sessionUser: { id: "user-1" },
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      chatId: "new",
      error: "Duplicate request",
    });
    expect(apiLogger.requestFailed).toHaveBeenCalledWith(
      409,
      "Duplicate request",
      expect.objectContaining({
        chatId: "new",
        idempotencyKey: "idem-key",
      })
    );
  });

  it("creates a new chat, persists normalized user messages, and delegates to the persisted stream builder", async () => {
    const apiLogger = createApiLoggerStub();
    const response = await handlePersistedChatRequest({
      apiLogger: apiLogger as never,
      body: {
        chatId: "new",
        messages: [
          {
            id: "message-1",
            parts: [
              { text: "Explain torque", type: "text" },
              {
                mediaType: "image",
                type: "file",
                url: "blob:local-preview",
              },
              {
                mediaType: "image/png",
                type: "file",
                url: "https://cdn.example.com/diagram.png",
              },
            ],
            role: "user",
          },
        ],
        selectedModel: "apollo-apex",
      },
      request: createRequest(
        {
          chatId: "new",
          messages: [
            {
              id: "message-1",
              parts: [
                { text: "Explain torque", type: "text" },
                {
                  mediaType: "image",
                  type: "file",
                  url: "blob:local-preview",
                },
                {
                  mediaType: "image/png",
                  type: "file",
                  url: "https://cdn.example.com/diagram.png",
                },
              ],
              role: "user",
            },
          ],
          selectedModel: "apollo-apex",
        },
        "idem-key"
      ),
      sessionUser: { id: "user-1", name: "Avenire User" },
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    });

    expect(response.status).toBe(200);
    expect(createChatForUserMock).toHaveBeenCalledWith(
      "user-1",
      "workspace-1",
      "New Method"
    );
    expect(saveMessagesForChatSlugMock).toHaveBeenCalledWith(
      "user-1",
      "chat-1",
      [
        {
          id: "message-1",
          parts: [
            { text: "Explain torque", type: "text" },
            {
              mediaType: "image/png",
              type: "file",
              url: "https://cdn.example.com/diagram.png",
            },
          ],
          role: "user",
        },
      ],
      "workspace-1"
    );
    expect(buildPersistedChatStreamResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chatCreatedFromNew: true,
        chatSlug: "chat-1",
        idempotencyLockAcquired: true,
        idempotencyRedisKey: "idem-1",
        originalMessages: [
          {
            id: "message-1",
            parts: [
              { text: "Explain torque", type: "text" },
              {
                mediaType: "image/png",
                type: "file",
                url: "https://cdn.example.com/diagram.png",
              },
            ],
            role: "user",
          },
        ],
      })
    );
  });

  it("clears the idempotency key and returns 429 when initial usage is over limit", async () => {
    consumeChatUnitsMock.mockResolvedValue({
      ok: false,
      retryAfter: new Date("2026-05-18T01:00:00.000Z"),
    });
    const apiLogger = createApiLoggerStub();

    const response = await handlePersistedChatRequest({
      apiLogger: apiLogger as never,
      body: { chatId: "new", messages: [] },
      request: createRequest({ chatId: "new", messages: [] }, "idem-key"),
      sessionUser: { id: "user-1" },
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Chat usage limit reached",
      retryAfter: "2026-05-18T01:00:00.000Z",
    });
    expect(clearIdempotencyKeyMock).toHaveBeenCalledWith("idem-1");
    expect(apiLogger.rateLimited).toHaveBeenCalledWith(
      "chat",
      "2026-05-18T01:00:00.000Z",
      { chatId: "chat-1" }
    );
  });

  it("clears idempotency and returns 500 when persisting user messages fails", async () => {
    saveMessagesForChatSlugMock.mockRejectedValue(new Error("save failed"));
    const apiLogger = createApiLoggerStub();

    const response = await handlePersistedChatRequest({
      apiLogger: apiLogger as never,
      body: {
        chatId: "new",
        messages: [{ id: "message-1", parts: [], role: "user" }],
      },
      request: createRequest(
        {
          chatId: "new",
          messages: [{ id: "message-1", parts: [], role: "user" }],
        },
        "idem-key"
      ),
      sessionUser: { id: "user-1" },
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to save user messages",
    });
    expect(clearIdempotencyKeyMock).toHaveBeenCalledWith("idem-1");
    expect(apiLogger.requestFailed).toHaveBeenCalledWith(
      500,
      "Failed to save user messages",
      { chatId: "chat-1" }
    );
  });
});
