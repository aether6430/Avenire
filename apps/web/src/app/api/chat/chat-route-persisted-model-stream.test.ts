import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  APOLLO_LANGUAGE_MODEL_IDS_MOCK,
  APOLLO_PROMPT_MOCK,
  apolloLanguageModelMock,
  buildRecentSessionSummaryContextMock,
  clearActiveStreamIdMock,
  convertToModelMessagesMock,
  createChatToolsMock,
  formatErrorMock,
  getCachedLearningPromptMemoryBlocksMock,
  logErrorMock,
  logInfoMock,
  logWarnMock,
  smoothStreamMock,
  stepCountIsMock,
  streamTextMock,
} = vi.hoisted(() => ({
  APOLLO_LANGUAGE_MODEL_IDS_MOCK: { "apollo-apex": "provider-apollo-apex" },
  APOLLO_PROMPT_MOCK: vi.fn(),
  apolloLanguageModelMock: vi.fn(),
  buildRecentSessionSummaryContextMock: vi.fn(),
  clearActiveStreamIdMock: vi.fn(),
  convertToModelMessagesMock: vi.fn(),
  createChatToolsMock: vi.fn(),
  formatErrorMock: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : String(error)
  ),
  getCachedLearningPromptMemoryBlocksMock: vi.fn(),
  logErrorMock: vi.fn(),
  logInfoMock: vi.fn(),
  logWarnMock: vi.fn(),
  smoothStreamMock: vi.fn(),
  stepCountIsMock: vi.fn(),
  streamTextMock: vi.fn(),
}));

vi.mock("@avenire/ai", () => ({
  APOLLO_LANGUAGE_MODEL_IDS: APOLLO_LANGUAGE_MODEL_IDS_MOCK,
  APOLLO_PROMPT: APOLLO_PROMPT_MOCK,
  apollo: {
    languageModel: apolloLanguageModelMock,
  },
  convertToModelMessages: convertToModelMessagesMock,
  smoothStream: smoothStreamMock,
  stepCountIs: stepCountIsMock,
  streamText: streamTextMock,
}));

vi.mock("@/lib/chat-tools", () => ({
  createChatTools: createChatToolsMock,
}));

vi.mock("@/lib/session-summaries", () => ({
  buildRecentSessionSummaryContext: buildRecentSessionSummaryContextMock,
}));

vi.mock("./chat-route-cache", () => ({
  getCachedLearningPromptMemoryBlocks: getCachedLearningPromptMemoryBlocksMock,
}));

vi.mock("./chat-route-logging", () => ({
  formatError: formatErrorMock,
  logError: logErrorMock,
  logInfo: logInfoMock,
  logWarn: logWarnMock,
}));

vi.mock("./chat-stream-store", () => ({
  clearActiveStreamId: clearActiveStreamIdMock,
}));

import { createPersistedChatModelStream } from "./chat-route-persisted-model-stream";

function buildStartupContext(overrides: Record<string, unknown> = {}) {
  return {
    latestUserText: "Explain angular momentum",
    recentRelevantSummary: {
      summaryText: "Reviewed angular momentum.",
      updatedAt: "2026-05-18T00:00:00.000Z",
    },
    resolvedSubject: "Physics",
    resolvedTopic: "Angular momentum",
    workspaceSubjectSummary: {
      subject: "Physics",
    },
    ...overrides,
  } as never;
}

describe("chat route persisted model stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    convertToModelMessagesMock.mockResolvedValue([{ role: "user" }]);
    getCachedLearningPromptMemoryBlocksMock.mockResolvedValue([
      { content: "Memory block", kind: "subject" },
    ]);
    buildRecentSessionSummaryContextMock.mockReturnValue(
      "Recent session summary"
    );
    APOLLO_PROMPT_MOCK.mockReturnValue("system prompt");
    apolloLanguageModelMock.mockReturnValue({ providerModel: "apollo-apex" });
    stepCountIsMock.mockReturnValue("stop-after-8");
    smoothStreamMock.mockReturnValue("smooth-transform");
    createChatToolsMock.mockReturnValue({
      note_agent: { description: "allowed" },
      unknown_tool: { description: "blocked" },
    });
    streamTextMock.mockReturnValue({ id: "result-stream" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds a persisted model stream with filtered tools, prompt memory, and legacy widget config", async () => {
    const apiLogger = {
      requestFailed: vi.fn(),
    };
    const writer = {
      write: vi.fn(),
    };

    const result = await createPersistedChatModelStream({
      apiLogger: apiLogger as never,
      body: {
        selectedModel: "apollo-apex",
        userName: "Avenire User",
      },
      chatSlug: "chat-1",
      modelContextMessages: [{ id: "message-1", role: "user" }] as never,
      request: new Request("http://localhost/api/chat"),
      sessionUser: {
        id: "user-1",
        name: "Fallback User",
      },
      startupContext: buildStartupContext(),
      streamId: "stream-1",
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
      writer,
    });

    expect(result).toEqual({
      result: { id: "result-stream" },
      selectedModel: "apollo-apex",
    });
    expect(createChatToolsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentActivityId: expect.any(String),
        chatSlug: "chat-1",
        rootFolderId: "root-1",
        userId: "user-1",
        workspaceId: "workspace-1",
      }),
      {
        legacyShowWidgetSchema: true,
      }
    );
    expect(APOLLO_PROMPT_MOCK).toHaveBeenCalledWith(
      "Avenire User",
      [{ content: "Memory block", kind: "subject" }],
      { useWidgetSpec: false }
    );
    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: "user" }],
        tools: { note_agent: { description: "allowed" } },
      })
    );

    const streamArgs = streamTextMock.mock.calls[0]?.[0];
    await streamArgs.onChunk({
      chunk: {
        toolCallId: "call-1",
        toolName: "note_agent",
        type: "tool-call",
      },
    });
    await streamArgs.onChunk({
      chunk: {
        toolCallId: "call-1",
        toolName: "note_agent",
        type: "tool-result",
      },
    });
    expect(logInfoMock).toHaveBeenCalledWith(
      "Streaming tool call chunk",
      expect.objectContaining({ chatId: "chat-1", toolName: "note_agent" })
    );
    expect(logInfoMock).toHaveBeenCalledWith(
      "Streaming tool result chunk",
      expect.objectContaining({ chatId: "chat-1", toolName: "note_agent" })
    );
  });

  it("falls back when learning prompt memory blocks time out", async () => {
    vi.useFakeTimers();
    getCachedLearningPromptMemoryBlocksMock.mockImplementation(
      () => new Promise(() => undefined)
    );

    const promise = createPersistedChatModelStream({
      apiLogger: {
        requestFailed: vi.fn(),
      } as never,
      body: {
        selectedModel: "apollo-apex",
      },
      chatSlug: "chat-2",
      modelContextMessages: [{ id: "message-1", role: "user" }] as never,
      request: new Request("http://localhost/api/chat"),
      sessionUser: {
        id: "user-1",
      },
      startupContext: buildStartupContext(),
      streamId: "stream-2",
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
      writer: {
        write: vi.fn(),
      },
    });

    await vi.advanceTimersByTimeAsync(1200);
    await promise;

    expect(logWarnMock).toHaveBeenCalledWith(
      "Startup context timed out; continuing without it",
      expect.objectContaining({
        label: "learning-prompt-memory",
        timeoutMs: 1200,
      })
    );
    expect(APOLLO_PROMPT_MOCK).toHaveBeenCalledWith(undefined, undefined, {
      useWidgetSpec: false,
    });
  });

  it("clears the active stream id and reports request failure when stream startup throws", async () => {
    const streamError = new Error("stream start failed");
    streamTextMock.mockImplementation(() => {
      throw streamError;
    });
    const apiLogger = {
      requestFailed: vi.fn(),
    };

    await expect(
      createPersistedChatModelStream({
        apiLogger: apiLogger as never,
        body: {
          selectedModel: "apollo-apex",
        },
        chatSlug: "chat-3",
        modelContextMessages: [{ id: "message-1", role: "user" }] as never,
        request: new Request("http://localhost/api/chat"),
        sessionUser: {
          id: "user-1",
        },
        startupContext: buildStartupContext(),
        streamId: "stream-3",
        workspace: {
          rootFolderId: "root-1",
          workspaceId: "workspace-1",
        },
        writer: {
          write: vi.fn(),
        },
      })
    ).rejects.toThrow("stream start failed");

    expect(clearActiveStreamIdMock).toHaveBeenCalledWith("chat-3", "stream-3");
    expect(logErrorMock).toHaveBeenCalledWith(
      "Failed to start model stream",
      expect.objectContaining({
        chatId: "chat-3",
        error: streamError,
      })
    );
    expect(apiLogger.requestFailed).toHaveBeenCalledWith(500, streamError, {
      chatId: "chat-3",
    });
  });
});
