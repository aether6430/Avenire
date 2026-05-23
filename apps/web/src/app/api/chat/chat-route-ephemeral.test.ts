import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  APOLLO_LANGUAGE_MODEL_IDS_MOCK,
  APOLLO_PROMPT_MOCK,
  apolloLanguageModelMock,
  consumeChatUnitsMock,
  convertToModelMessagesMock,
  createChatToolsMock,
  formatErrorMock,
  getChatStreamErrorMessageMock,
  logErrorMock,
  smoothStreamMock,
  stepCountIsMock,
  streamTextMock,
} = vi.hoisted(() => ({
  APOLLO_LANGUAGE_MODEL_IDS_MOCK: { "apollo-apex": "provider-apollo-apex" },
  APOLLO_PROMPT_MOCK: vi.fn(),
  apolloLanguageModelMock: vi.fn((model: string) => ({ model })),
  consumeChatUnitsMock: vi.fn(),
  convertToModelMessagesMock: vi.fn(),
  createChatToolsMock: vi.fn(),
  formatErrorMock: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : String(error)
  ),
  getChatStreamErrorMessageMock: vi.fn(() => "ephemeral failed"),
  logErrorMock: vi.fn(),
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

vi.mock("@/lib/billing-metering", () => ({
  consumeChatUnits: consumeChatUnitsMock,
}));

vi.mock("@/lib/chat-tools", () => ({
  createChatTools: createChatToolsMock,
}));

vi.mock("./chat-route-logging", () => ({
  formatError: formatErrorMock,
  getChatStreamErrorMessage: getChatStreamErrorMessageMock,
  logError: logErrorMock,
}));

import { handleEphemeralChatRequest } from "./chat-route-ephemeral";

function createApiLoggerStub() {
  return {
    rateLimited: vi.fn(),
    requestFailed: vi.fn(),
    requestSucceeded: vi.fn(),
  };
}

describe("chat route ephemeral", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeChatUnitsMock.mockResolvedValue({
      ok: true,
      retryAfter: null,
    });
    APOLLO_PROMPT_MOCK.mockReturnValue("system prompt");
    createChatToolsMock.mockReturnValue({
      note_agent: { description: "allowed" },
      show_widget: { description: "excluded" },
      visualize_read_me: { description: "excluded" },
      unknown_tool: { description: "blocked" },
    });
    convertToModelMessagesMock.mockResolvedValue([{ role: "assistant" }]);
    stepCountIsMock.mockReturnValue("stop-after-8");
    smoothStreamMock.mockReturnValue("smooth-transform");
    streamTextMock.mockReturnValue({
      toUIMessageStreamResponse: vi.fn(
        () => new Response("ok", { status: 200 })
      ),
    });
  });

  it("returns 429 when initial chat usage is over limit", async () => {
    consumeChatUnitsMock.mockResolvedValue({
      ok: false,
      retryAfter: new Date("2026-05-18T02:00:00.000Z"),
    });
    const apiLogger = createApiLoggerStub();

    const response = await handleEphemeralChatRequest({
      apiLogger: apiLogger as never,
      body: {
        messages: [],
        selectionBase64: "abcd",
      },
      request: new Request("http://localhost/api/chat"),
      sessionUser: { id: "user-1" },
      workspace: { rootFolderId: "root-1", workspaceId: "workspace-1" },
    });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Chat usage limit reached",
      retryAfter: "2026-05-18T02:00:00.000Z",
    });
    expect(consumeChatUnitsMock).toHaveBeenCalledWith("user-1", 2);
    expect(apiLogger.rateLimited).toHaveBeenCalledWith(
      "chat",
      "2026-05-18T02:00:00.000Z",
      { chatId: "ephemeral" }
    );
  });

  it("builds the ephemeral multimodal stream and filters tools for selection inspection", async () => {
    const apiLogger = createApiLoggerStub();
    const response = await handleEphemeralChatRequest({
      apiLogger: apiLogger as never,
      body: {
        messages: [
          {
            id: "assistant-1",
            parts: [{ text: "Earlier context", type: "text" }],
            role: "assistant",
          },
          {
            id: "user-1",
            parts: [{ text: "Explain what this crop shows", type: "text" }],
            role: "user",
          },
        ] as never,
        selectedModel: "apollo-apex",
        selectionBase64: Buffer.from("image").toString("base64"),
        selectionMediaType: "",
        userName: "Avenire User",
      },
      request: new Request("http://localhost/api/chat"),
      sessionUser: { id: "user-1", name: "Fallback User" },
      workspace: { rootFolderId: "root-1", workspaceId: "workspace-1" },
    });

    expect(response.status).toBe(200);
    expect(consumeChatUnitsMock).toHaveBeenCalledWith("user-1", 3);
    expect(convertToModelMessagesMock).toHaveBeenCalledWith(
      [
        {
          id: "assistant-1",
          parts: [{ text: "Earlier context", type: "text" }],
          role: "assistant",
        },
      ],
      { tools: createChatToolsMock.mock.results[0]?.value }
    );
    expect(createChatToolsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chatSlug: expect.stringMatching(/^selection-ephemeral:/),
      })
    );
    expect(APOLLO_PROMPT_MOCK).toHaveBeenCalledWith(
      "Avenire User",
      expect.stringContaining("The selected image is evidence"),
      { allowVisualizations: false }
    );
    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: "assistant" },
          expect.objectContaining({
            content: [
              {
                text: "Explain what this crop shows",
                type: "text",
              },
              expect.objectContaining({
                mediaType: "image/png",
                type: "image",
              }),
            ],
            role: "user",
          }),
        ],
        tools: { note_agent: { description: "allowed" } },
      })
    );
    expect(apiLogger.requestSucceeded).toHaveBeenCalledWith(200, {
      chatId: "ephemeral",
      selectedModel: "apollo-apex",
    });
  });

  it("returns 500 and reports request failure when stream startup throws", async () => {
    const apiLogger = createApiLoggerStub();
    const error = new Error("stream failed");
    streamTextMock.mockImplementation(() => {
      throw error;
    });

    const response = await handleEphemeralChatRequest({
      apiLogger: apiLogger as never,
      body: {
        messages: [{ id: "user-1", parts: [], role: "user" }] as never,
        selectionBase64: Buffer.from("image").toString("base64"),
      },
      request: new Request("http://localhost/api/chat"),
      sessionUser: { id: "user-1" },
      workspace: { rootFolderId: "root-1", workspaceId: "workspace-1" },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to inspect selection",
    });
    expect(logErrorMock).toHaveBeenCalledWith("Failed to inspect selection", {
      error: "stream failed",
      model: "apollo-apex",
      providerModel: "provider-apollo-apex",
    });
    expect(apiLogger.requestFailed).toHaveBeenCalledWith(
      500,
      error,
      expect.objectContaining({
        chatId: "ephemeral",
        selectedModel: "apollo-apex",
      })
    );
  });
});
