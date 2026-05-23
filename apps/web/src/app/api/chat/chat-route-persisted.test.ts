import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  afterMock,
  buildPersistedChatStreamResponseMock,
  buildChatIdempotencyRedisKeyMock,
  clearIdempotencyKeyMock,
  consumeChatUnitsMock,
  createChatForUserMock,
  formatErrorMock,
  getChatBySlugForUserMock,
  getWritableChatBySlugForUserMock,
  getIdempotencyStateMock,
  invalidateChatReadCachesMock,
  isChatOwnerForUserMock,
  loadPersistedChatStartupContextMock,
  logErrorMock,
  logInfoMock,
  logWarnMock,
  prewarmActiveMisconceptionsCacheMock,
  saveMessagesForChatSlugMock,
  tryAcquireIdempotencyLockMock,
} = vi.hoisted(() => ({
  afterMock: vi.fn(),
  buildPersistedChatStreamResponseMock: vi.fn(),
  buildChatIdempotencyRedisKeyMock: vi.fn(),
  clearIdempotencyKeyMock: vi.fn(),
  consumeChatUnitsMock: vi.fn(),
  createChatForUserMock: vi.fn(),
  formatErrorMock: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : String(error)
  ),
  getChatBySlugForUserMock: vi.fn(),
  getWritableChatBySlugForUserMock: vi.fn(),
  getIdempotencyStateMock: vi.fn(),
  invalidateChatReadCachesMock: vi.fn(),
  isChatOwnerForUserMock: vi.fn(),
  loadPersistedChatStartupContextMock: vi.fn(),
  logErrorMock: vi.fn(),
  logInfoMock: vi.fn(),
  logWarnMock: vi.fn(),
  prewarmActiveMisconceptionsCacheMock: vi.fn(),
  saveMessagesForChatSlugMock: vi.fn(),
  tryAcquireIdempotencyLockMock: vi.fn(),
}));

vi.mock("@/lib/billing-metering", () => ({
  consumeChatUnits: consumeChatUnitsMock,
}));

vi.mock("@/lib/chat-data", () => ({
  createChatForUser: createChatForUserMock,
  getChatBySlugForUser: getChatBySlugForUserMock,
  getWritableChatBySlugForUser: getWritableChatBySlugForUserMock,
  isChatOwnerForUser: isChatOwnerForUserMock,
  saveMessagesForChatSlug: saveMessagesForChatSlugMock,
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateChatReadCaches: invalidateChatReadCachesMock,
}));

vi.mock("next/server", async () => {
  const actual =
    await vi.importActual<typeof import("next/server")>("next/server");

  return {
    ...actual,
    after: afterMock,
  };
});

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
  logWarn: logWarnMock,
}));

vi.mock("./chat-route-persisted-context", () => ({
  loadPersistedChatStartupContext: loadPersistedChatStartupContextMock,
}));

vi.mock("@/lib/chat-tools/chat-tool-misconception-runtime", () => ({
  prewarmActiveMisconceptionsCache: prewarmActiveMisconceptionsCacheMock,
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
    afterMock.mockImplementation(() => undefined);
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
    prewarmActiveMisconceptionsCacheMock.mockReset();
    prewarmActiveMisconceptionsCacheMock.mockResolvedValue(undefined);
    saveMessagesForChatSlugMock.mockResolvedValue(undefined);
    invalidateChatReadCachesMock.mockResolvedValue(undefined);
    getChatBySlugForUserMock.mockReset();
    getWritableChatBySlugForUserMock.mockReset();
    isChatOwnerForUserMock.mockReset();
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

  it("short-circuits duplicate existing-chat requests before startup context loads", async () => {
    getWritableChatBySlugForUserMock.mockResolvedValue({
      id: "chat-db-2",
      readOnly: false,
      slug: "chat-2",
      title: "Existing Method",
    });
    getIdempotencyStateMock.mockResolvedValue({ status: "done" });
    const apiLogger = createApiLoggerStub();

    const response = await handlePersistedChatRequest({
      apiLogger: apiLogger as never,
      body: {
        chatId: "chat-2",
        messages: [],
      },
      request: createRequest({ chatId: "chat-2", messages: [] }, "idem-key"),
      sessionUser: { id: "user-1" },
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      chatId: "chat-2",
      error: "Duplicate request",
    });
    expect(loadPersistedChatStartupContextMock).not.toHaveBeenCalled();
    expect(consumeChatUnitsMock).not.toHaveBeenCalled();
    expect(isChatOwnerForUserMock).not.toHaveBeenCalled();
  });

  it("short-circuits in-progress existing-chat requests before startup context loads", async () => {
    getWritableChatBySlugForUserMock.mockResolvedValue({
      id: "chat-db-2",
      readOnly: false,
      slug: "chat-2",
      title: "Existing Method",
    });
    tryAcquireIdempotencyLockMock.mockResolvedValue(false);
    const apiLogger = createApiLoggerStub();

    const response = await handlePersistedChatRequest({
      apiLogger: apiLogger as never,
      body: {
        chatId: "chat-2",
        messages: [],
      },
      request: createRequest({ chatId: "chat-2", messages: [] }, "idem-key"),
      sessionUser: { id: "user-1" },
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      chatId: "chat-2",
      error: "Request already in progress",
    });
    expect(loadPersistedChatStartupContextMock).not.toHaveBeenCalled();
    expect(consumeChatUnitsMock).not.toHaveBeenCalled();
    expect(isChatOwnerForUserMock).not.toHaveBeenCalled();
  });

  it("creates a concrete new chat when a writable slug does not exist yet but a user message is present", async () => {
    getWritableChatBySlugForUserMock.mockResolvedValue(null);
    const apiLogger = createApiLoggerStub();

    const response = await handlePersistedChatRequest({
      apiLogger: apiLogger as never,
      body: {
        chatId: "chat-concrete-1",
        messages: [
          {
            id: "message-1",
            parts: [{ text: "Explain torque", type: "text" }],
            role: "user",
          },
        ],
      },
      request: createRequest(
        {
          chatId: "chat-concrete-1",
          messages: [
            {
              id: "message-1",
              parts: [{ text: "Explain torque", type: "text" }],
              role: "user",
            },
          ],
        },
        "idem-key"
      ),
      sessionUser: { id: "user-1" },
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    });

    expect(response.status).toBe(200);
    expect(createChatForUserMock).toHaveBeenCalledWith(
      "user-1",
      "workspace-1",
      "New Method",
      "chat-concrete-1"
    );
    expect(buildPersistedChatStreamResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chatCreatedFromNew: true,
        chatSlug: "chat-concrete-1",
      })
    );
    expect(loadPersistedChatStartupContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chatSlug: "chat-concrete-1",
      })
    );
  });

  it("returns read-only method from the writable helper without loading startup context", async () => {
    getWritableChatBySlugForUserMock.mockResolvedValue({
      id: "chat-db-2",
      readOnly: true,
      slug: "chat-2",
      title: "Shared Method",
    });
    const apiLogger = createApiLoggerStub();

    const response = await handlePersistedChatRequest({
      apiLogger: apiLogger as never,
      body: {
        chatId: "chat-2",
        messages: [],
      },
      request: createRequest({ chatId: "chat-2", messages: [] }, "idem-key"),
      sessionUser: { id: "user-1" },
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Read-only Method",
    });
    expect(loadPersistedChatStartupContextMock).not.toHaveBeenCalled();
    expect(consumeChatUnitsMock).not.toHaveBeenCalled();
    expect(isChatOwnerForUserMock).not.toHaveBeenCalled();
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
    expect(consumeChatUnitsMock).toHaveBeenCalledWith("user-1", 3);
    expect(afterMock).toHaveBeenCalledTimes(2);
    expect(buildPersistedChatStreamResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedCredits: 3,
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

  it("prewarms the active misconception cache after startup context resolution", async () => {
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

    expect(response.status).toBe(200);
    expect(prewarmActiveMisconceptionsCacheMock).toHaveBeenCalledWith({
      subject: "Physics",
      topic: "Torque",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
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
    expect(consumeChatUnitsMock).toHaveBeenCalledWith("user-1", 2);
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

  it("does not fail the request when post-save chat cache invalidation is deferred", async () => {
    invalidateChatReadCachesMock.mockRejectedValue(
      new Error("cache invalidate failed")
    );
    getWritableChatBySlugForUserMock.mockResolvedValue({
      id: "chat-db-2",
      readOnly: false,
      slug: "chat-2",
      title: "Existing Method",
    });
    const apiLogger = createApiLoggerStub();

    const response = await handlePersistedChatRequest({
      apiLogger: apiLogger as never,
      body: {
        chatId: "chat-2",
        messages: [{ id: "message-1", parts: [], role: "user" }],
      },
      request: createRequest(
        {
          chatId: "chat-2",
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

    expect(response.status).toBe(200);
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(buildPersistedChatStreamResponseMock).toHaveBeenCalled();
    expect(apiLogger.requestFailed).not.toHaveBeenCalledWith(
      500,
      "Failed to save user messages",
      expect.anything()
    );
  });
});
