import { TextEncoder } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  afterMock,
  clearActiveStreamIdMock,
  clearIdempotencyKeyMock,
  createPersistedChatModelStreamMock,
  createResumableStreamContextMock,
  createUIMessageStreamMock,
  createUIMessageStreamResponseMock,
  formatErrorMock,
  generateChatMetadataMock,
  generateChatThinkingMessagesMock,
  getActiveStreamIdMock,
  getRedisClientMock,
  getRedisSubscriberMock,
  getChatStreamErrorMessageMock,
  handlePersistedChatStreamFinishMock,
  hasChatStreamStoreConfigMock,
  invalidateChatReadCachesMock,
  isAbortLikeErrorMock,
  logErrorMock,
  logInfoMock,
  logWarnMock,
  markIdempotencyDoneMock,
  randomUUIDMock,
  saveMessagesForChatSlugMock,
  setActiveStreamIdMock,
  shouldGenerateTitleMock,
  updateChatForUserMock,
} = vi.hoisted(() => ({
  afterMock: vi.fn(),
  clearActiveStreamIdMock: vi.fn(),
  clearIdempotencyKeyMock: vi.fn(),
  createPersistedChatModelStreamMock: vi.fn(),
  createResumableStreamContextMock: vi.fn(),
  createUIMessageStreamMock: vi.fn(),
  createUIMessageStreamResponseMock: vi.fn(),
  formatErrorMock: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : String(error)
  ),
  generateChatMetadataMock: vi.fn(),
  generateChatThinkingMessagesMock: vi.fn(),
  getActiveStreamIdMock: vi.fn(),
  getRedisClientMock: vi.fn(),
  getRedisSubscriberMock: vi.fn(),
  getChatStreamErrorMessageMock: vi.fn(),
  handlePersistedChatStreamFinishMock: vi.fn(),
  hasChatStreamStoreConfigMock: vi.fn(),
  invalidateChatReadCachesMock: vi.fn(),
  isAbortLikeErrorMock: vi.fn(),
  logErrorMock: vi.fn(),
  logInfoMock: vi.fn(),
  logWarnMock: vi.fn(),
  markIdempotencyDoneMock: vi.fn(),
  randomUUIDMock: vi.fn(),
  saveMessagesForChatSlugMock: vi.fn(),
  setActiveStreamIdMock: vi.fn(),
  shouldGenerateTitleMock: vi.fn(),
  updateChatForUserMock: vi.fn(),
}));

vi.mock("node:crypto", () => ({
  randomUUID: randomUUIDMock,
}));

vi.mock("@avenire/ai", () => ({
  createUIMessageStream: createUIMessageStreamMock,
  createUIMessageStreamResponse: createUIMessageStreamResponseMock,
}));

vi.mock("next/server", () => ({
  after: afterMock,
}));

vi.mock("resumable-stream", () => ({
  createResumableStreamContext: createResumableStreamContextMock,
}));

vi.mock("@/lib/chat-data", () => ({
  saveMessagesForChatSlug: saveMessagesForChatSlugMock,
  updateChatForUser: updateChatForUserMock,
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateChatReadCaches: invalidateChatReadCachesMock,
}));

vi.mock("./chat-route-cache", () => ({
  clearIdempotencyKey: clearIdempotencyKeyMock,
  markIdempotencyDone: markIdempotencyDoneMock,
}));

vi.mock("./chat-route-logging", () => ({
  formatError: formatErrorMock,
  getChatStreamErrorMessage: getChatStreamErrorMessageMock,
  isAbortLikeError: isAbortLikeErrorMock,
  logError: logErrorMock,
  logInfo: logInfoMock,
  logWarn: logWarnMock,
}));

vi.mock("./chat-route-metadata", () => ({
  generateChatMetadata: generateChatMetadataMock,
  generateChatThinkingMessages: generateChatThinkingMessagesMock,
}));

vi.mock("./chat-route-model", () => ({
  DEFAULT_THINKING_MESSAGES: [
    "Thinking through the details",
    "Checking the shape of the answer",
  ],
  shouldGenerateTitle: shouldGenerateTitleMock,
}));

vi.mock("./chat-route-persisted-finish", () => ({
  handlePersistedChatStreamFinish: handlePersistedChatStreamFinishMock,
}));

vi.mock("./chat-route-persisted-model-stream", () => ({
  createPersistedChatModelStream: createPersistedChatModelStreamMock,
}));

vi.mock("./chat-stream-store", () => ({
  clearActiveStreamId: clearActiveStreamIdMock,
  getActiveStreamId: getActiveStreamIdMock,
  getRedisClient: getRedisClientMock,
  getRedisSubscriber: getRedisSubscriberMock,
  hasChatStreamStoreConfig: hasChatStreamStoreConfigMock,
  setActiveStreamId: setActiveStreamIdMock,
}));

import { buildPersistedChatStreamResponse } from "./chat-route-persisted-stream";

const encoder = new TextEncoder();

function createResponseWithBody() {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("stream"));
        controller.close();
      },
    }),
    {
      headers: new Headers({ "content-type": "text/plain" }),
      status: 200,
      statusText: "OK",
    }
  );
}

async function flushPromises() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

describe("chat route persisted stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    randomUUIDMock.mockReturnValue("stream-1");
    const toUIMessageStreamMock = vi.fn(() => "merged-stream");
    hasChatStreamStoreConfigMock.mockReturnValue(false);
    getActiveStreamIdMock
      .mockResolvedValueOnce("previous-stream")
      .mockResolvedValue("stream-1");
    createUIMessageStreamResponseMock.mockReturnValue(createResponseWithBody());
    generateChatThinkingMessagesMock.mockResolvedValue(["Thinking harder"]);
    generateChatMetadataMock.mockResolvedValue({
      icon: "sparkles",
      title: "Momentum Review",
    });
    shouldGenerateTitleMock.mockReturnValue(true);
    isAbortLikeErrorMock.mockReturnValue(false);
    getChatStreamErrorMessageMock.mockReturnValue("Stream failed.");
    createPersistedChatModelStreamMock.mockResolvedValue({
      result: {
        toUIMessageStream: toUIMessageStreamMock,
      },
      selectedModel: "apollo-apex",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes chat-created and thinking messages, streams generated metadata, and wires finish handling", async () => {
    const writer = {
      merge: vi.fn(),
      write: vi.fn(),
    };

    createUIMessageStreamMock.mockImplementation(async ({ execute }) => {
      await execute({ writer });
      return { id: "ui-stream" };
    });

    const apiLogger = {
      requestSucceeded: vi.fn(),
    };

    const response = await buildPersistedChatStreamResponse({
      apiLogger: apiLogger as never,
      body: {
        chatId: "new",
        selectedModel: "apollo-apex",
        userName: "Avenire User",
      },
      chat: {
        id: "chat-db-1",
        title: "New Method",
      } as never,
      chatCreatedFromNew: true,
      chatSlug: "chat-1",
      idempotencyLockAcquired: false,
      idempotencyRedisKey: null,
      modelContextMessages: [{ id: "message-1", role: "user" }] as never,
      originalMessages: [{ id: "message-1", role: "user" }] as never,
      request: new Request("http://localhost/api/chat"),
      requestStartedAt: new Date("2026-05-18T00:00:00.000Z"),
      sessionUser: {
        id: "user-1",
        name: "Avenire User",
      },
      startupContext: {
        latestUserText: "Explain angular momentum",
        recentRelevantSummary: null,
        resolvedSubject: "Physics",
        resolvedTopic: "Angular momentum",
        workspaceSubjectSummary: null,
      },
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    });

    await flushPromises();

    expect(response.status).toBe(200);
    expect(setActiveStreamIdMock).toHaveBeenCalled();
    expect(clearActiveStreamIdMock).toHaveBeenCalledWith(
      "chat-1",
      "previous-stream"
    );
    expect(writer.write).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          fromId: "new",
          id: "chat-1",
          title: "New Method",
        },
        type: "data-chatCreated",
      })
    );
    expect(writer.write).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          id: "chat-1",
          messages: [
            "Thinking through the details",
            "Checking the shape of the answer",
          ],
        },
        type: "data-thinkingMessages",
      })
    );
    expect(writer.write).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { id: "chat-1", messages: ["Thinking harder"] },
        type: "data-thinkingMessages",
      })
    );
    expect(writer.write).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          icon: "sparkles",
          id: "chat-1",
          name: "Momentum Review",
        },
        type: "data-chatName",
      })
    );
    expect(updateChatForUserMock).toHaveBeenCalledWith(
      "user-1",
      "chat-1",
      { icon: "sparkles", title: "Momentum Review" },
      "workspace-1"
    );
    expect(invalidateChatReadCachesMock).toHaveBeenCalledWith("workspace-1");
    expect(writer.merge).toHaveBeenCalledWith("merged-stream");
    expect(apiLogger.requestSucceeded).toHaveBeenCalledWith(
      200,
      expect.objectContaining({
        chatId: "chat-1",
        messageCount: 1,
        selectedModel: "apollo-apex",
      })
    );

    const createdStream =
      await createPersistedChatModelStreamMock.mock.results[0]?.value;
    const toUIArgs = createdStream?.result.toUIMessageStream.mock.calls[0]?.[0];
    await toUIArgs.onFinish({
      isContinuation: false,
      messages: [{ id: "assistant-1", role: "assistant" }],
      responseMessage: { id: "assistant-1", role: "assistant" },
    });
    expect(handlePersistedChatStreamFinishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chatSlug: "chat-1",
        streamId: expect.any(String),
      })
    );
  });

  it("persists failed streamed messages through onError and clears stream/idempotency state", async () => {
    const writer = {
      merge: vi.fn(),
      write: vi.fn(),
    };

    createUIMessageStreamMock.mockImplementation(async ({ execute }) => {
      await execute({ writer });
      return { id: "ui-stream" };
    });

    await buildPersistedChatStreamResponse({
      apiLogger: {
        requestSucceeded: vi.fn(),
      } as never,
      body: {
        chatId: "chat-2",
      },
      chat: {
        id: "chat-db-2",
        title: "Existing Method",
      } as never,
      chatCreatedFromNew: false,
      chatSlug: "chat-2",
      idempotencyLockAcquired: true,
      idempotencyRedisKey: "idem-2",
      modelContextMessages: [{ id: "message-1", role: "user" }] as never,
      originalMessages: [{ id: "message-1", role: "user" }] as never,
      request: new Request("http://localhost/api/chat"),
      requestStartedAt: new Date("2026-05-18T00:00:00.000Z"),
      sessionUser: {
        id: "user-1",
      },
      startupContext: {
        latestUserText: "Explain angular momentum",
        recentRelevantSummary: null,
        resolvedSubject: null,
        resolvedTopic: null,
        workspaceSubjectSummary: null,
      },
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    });

    const createdStream =
      await createPersistedChatModelStreamMock.mock.results[0]?.value;
    const toUIArgs = createdStream?.result.toUIMessageStream.mock.calls[0]?.[0];
    expect(toUIArgs.onError(new Error("stream exploded"))).toBe(
      "Stream failed."
    );
    await flushPromises();

    expect(saveMessagesForChatSlugMock).toHaveBeenCalledWith(
      "user-1",
      "chat-2",
      expect.arrayContaining([expect.objectContaining({ role: "assistant" })]),
      "workspace-1"
    );
    expect(clearActiveStreamIdMock).toHaveBeenCalledWith(
      "chat-2",
      expect.any(String)
    );
    expect(markIdempotencyDoneMock).toHaveBeenCalledWith("idem-2", "chat-2");
  });

  it("clears the active stream id when the UI stream response has no body", async () => {
    createUIMessageStreamMock.mockReturnValue({ id: "ui-stream" });
    createUIMessageStreamResponseMock.mockReturnValue(
      new Response(null, { status: 204, statusText: "No Content" })
    );

    const response = await buildPersistedChatStreamResponse({
      apiLogger: {
        requestSucceeded: vi.fn(),
      } as never,
      body: {
        chatId: "chat-3",
      },
      chat: {
        id: "chat-db-3",
        title: "Existing Method",
      } as never,
      chatCreatedFromNew: false,
      chatSlug: "chat-3",
      idempotencyLockAcquired: false,
      idempotencyRedisKey: null,
      modelContextMessages: [],
      originalMessages: [],
      request: new Request("http://localhost/api/chat"),
      requestStartedAt: new Date("2026-05-18T00:00:00.000Z"),
      sessionUser: {
        id: "user-1",
      },
      startupContext: {
        latestUserText: "",
        recentRelevantSummary: null,
        resolvedSubject: null,
        resolvedTopic: null,
        workspaceSubjectSummary: null,
      },
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    });

    expect(response.status).toBe(204);
    expect(clearActiveStreamIdMock).toHaveBeenCalledWith(
      "chat-3",
      expect.any(String)
    );
  });

  it("creates a resumable stream context when chat stream storage is configured", async () => {
    const writer = {
      merge: vi.fn(),
      write: vi.fn(),
    };
    const createNewResumableStream = vi.fn().mockResolvedValue(undefined);

    hasChatStreamStoreConfigMock.mockReturnValue(true);
    getRedisClientMock.mockResolvedValue("publisher-client");
    getRedisSubscriberMock.mockResolvedValue("subscriber-client");
    createResumableStreamContextMock.mockReturnValue({
      createNewResumableStream,
    });
    createUIMessageStreamMock.mockImplementation(async ({ execute }) => {
      await execute({ writer });
      return { id: "ui-stream" };
    });

    const response = await buildPersistedChatStreamResponse({
      apiLogger: {
        requestSucceeded: vi.fn(),
      } as never,
      body: {
        chatId: "chat-4",
      },
      chat: {
        id: "chat-db-4",
        title: "Existing Method",
      } as never,
      chatCreatedFromNew: false,
      chatSlug: "chat-4",
      idempotencyLockAcquired: false,
      idempotencyRedisKey: null,
      modelContextMessages: [{ id: "message-1", role: "user" }] as never,
      originalMessages: [{ id: "message-1", role: "user" }] as never,
      request: new Request("http://localhost/api/chat"),
      requestStartedAt: new Date("2026-05-18T00:00:00.000Z"),
      sessionUser: { id: "user-1" },
      startupContext: {
        latestUserText: "Explain angular momentum",
        recentRelevantSummary: null,
        resolvedSubject: null,
        resolvedTopic: null,
        workspaceSubjectSummary: null,
      },
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    });

    await flushPromises();

    expect(response.status).toBe(200);
    expect(createResumableStreamContextMock).toHaveBeenCalledWith({
      publisher: "publisher-client",
      subscriber: "subscriber-client",
      waitUntil: afterMock,
    });
    expect(createNewResumableStream).toHaveBeenCalledWith(
      "stream-1",
      expect.any(Function)
    );
  });

  it("sets the new active stream id before waiting for the previous stream lookup", async () => {
    let resolvePreviousStreamId: ((value: string | null) => void) | null = null;
    const previousStreamIdPromise = new Promise<string | null>((resolve) => {
      resolvePreviousStreamId = resolve;
    });

    getActiveStreamIdMock.mockReset();
    getActiveStreamIdMock.mockReturnValueOnce(previousStreamIdPromise);
    setActiveStreamIdMock.mockResolvedValue(undefined);

    const pendingResponse = buildPersistedChatStreamResponse({
      apiLogger: {
        requestSucceeded: vi.fn(),
      } as never,
      body: {
        chatId: "chat-order",
      },
      chat: {
        id: "chat-db-order",
        title: "Existing Method",
      } as never,
      chatCreatedFromNew: false,
      chatSlug: "chat-order",
      idempotencyLockAcquired: false,
      idempotencyRedisKey: null,
      modelContextMessages: [],
      originalMessages: [],
      request: new Request("http://localhost/api/chat"),
      requestStartedAt: new Date("2026-05-18T00:00:00.000Z"),
      sessionUser: { id: "user-1" },
      startupContext: {
        latestUserText: "",
        recentRelevantSummary: null,
        resolvedSubject: null,
        resolvedTopic: null,
        workspaceSubjectSummary: null,
      },
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    });

    await Promise.resolve();

    expect(setActiveStreamIdMock).toHaveBeenCalledWith(
      "chat-order",
      "stream-1"
    );

    resolvePreviousStreamId?.("previous-stream");
    const response = await pendingResponse;
    expect(response.status).toBe(200);
  });

  it("logs resumable stream creation failures and clears the active stream id", async () => {
    const writer = {
      merge: vi.fn(),
      write: vi.fn(),
    };

    hasChatStreamStoreConfigMock.mockReturnValue(true);
    getRedisClientMock.mockResolvedValue("publisher-client");
    getRedisSubscriberMock.mockResolvedValue("subscriber-client");
    createResumableStreamContextMock.mockReturnValue({
      createNewResumableStream: vi
        .fn()
        .mockRejectedValue(new Error("resumable failed")),
    });
    createUIMessageStreamMock.mockImplementation(async ({ execute }) => {
      await execute({ writer });
      return { id: "ui-stream" };
    });

    await buildPersistedChatStreamResponse({
      apiLogger: {
        requestSucceeded: vi.fn(),
      } as never,
      body: {
        chatId: "chat-5",
      },
      chat: {
        id: "chat-db-5",
        title: "Existing Method",
      } as never,
      chatCreatedFromNew: false,
      chatSlug: "chat-5",
      idempotencyLockAcquired: false,
      idempotencyRedisKey: null,
      modelContextMessages: [{ id: "message-1", role: "user" }] as never,
      originalMessages: [{ id: "message-1", role: "user" }] as never,
      request: new Request("http://localhost/api/chat"),
      requestStartedAt: new Date("2026-05-18T00:00:00.000Z"),
      sessionUser: { id: "user-1" },
      startupContext: {
        latestUserText: "Explain angular momentum",
        recentRelevantSummary: null,
        resolvedSubject: null,
        resolvedTopic: null,
        workspaceSubjectSummary: null,
      },
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    });

    await flushPromises();

    expect(clearActiveStreamIdMock).toHaveBeenCalledWith("chat-5", "stream-1");
    expect(logErrorMock).toHaveBeenCalledWith(
      "Failed to create resumable chat stream",
      expect.objectContaining({
        chatSlug: "chat-5",
        streamId: "stream-1",
        error: "resumable failed",
      })
    );
  });
});
