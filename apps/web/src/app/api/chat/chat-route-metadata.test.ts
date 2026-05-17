import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  APOLLO_LANGUAGE_MODEL_IDS_MOCK,
  apolloLanguageModelMock,
  generateTextMock,
  isAbortLikeErrorMock,
  logErrorMock,
  logInfoMock,
} = vi.hoisted(() => ({
  APOLLO_LANGUAGE_MODEL_IDS_MOCK: {
    "apollo-apex": "provider-apollo-apex",
    "apollo-meta": "provider-apollo-meta",
    "apollo-sprint": "provider-apollo-sprint",
    "apollo-tiny": "provider-apollo-tiny",
  },
  apolloLanguageModelMock: vi.fn((model: string) => ({ model })),
  generateTextMock: vi.fn(),
  isAbortLikeErrorMock: vi.fn(),
  logErrorMock: vi.fn(),
  logInfoMock: vi.fn(),
}));

vi.mock("@avenire/ai", () => ({
  APOLLO_LANGUAGE_MODEL_IDS: APOLLO_LANGUAGE_MODEL_IDS_MOCK,
  apollo: {
    languageModel: apolloLanguageModelMock,
  },
  generateText: generateTextMock,
}));

vi.mock("./chat-route-logging", () => ({
  isAbortLikeError: isAbortLikeErrorMock,
  logError: logErrorMock,
  logInfo: logInfoMock,
}));

import {
  generateChatMetadata,
  generateChatThinkingMessages,
  resolveChatTitleModel,
} from "./chat-route-metadata";

describe("chat route metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    isAbortLikeErrorMock.mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves the chat title model conservatively from env", () => {
    expect(resolveChatTitleModel()).toBe("apollo-meta");

    vi.stubEnv("CHAT_TITLE_MODEL", "apollo-apex");
    expect(resolveChatTitleModel()).toBe("apollo-apex");

    vi.stubEnv("CHAT_TITLE_MODEL", "apollo-sprint");
    expect(resolveChatTitleModel()).toBe("apollo-meta");

    vi.stubEnv("MISTRAL_API_KEY", "key");
    expect(resolveChatTitleModel()).toBe("apollo-sprint");
  });

  it("falls back cleanly when latest user text is missing or generateText returns empty", async () => {
    await expect(generateChatMetadata("")).resolves.toBeNull();

    generateTextMock.mockResolvedValue({ text: "   " });
    await expect(generateChatMetadata("Explain torque")).resolves.toEqual({
      icon: "MessageSquareText",
      title: "Explain torque",
    });
  });

  it("accepts valid JSON metadata and normalizes title/icon choices", async () => {
    generateTextMock.mockResolvedValue({
      text: '{"title":"  Angular Momentum Review  ","icon":"Sparkles"}',
    });

    await expect(
      generateChatMetadata("Explain angular momentum")
    ).resolves.toEqual({
      icon: "Sparkles",
      title: "Angular Momentum Review",
    });
  });

  it("falls back when generated JSON is invalid or too weak, and returns null on abort-like errors", async () => {
    generateTextMock.mockResolvedValueOnce({
      text: '{"title":"ok","icon":"not-real"}',
    });
    await expect(
      generateChatMetadata("Explain angular momentum carefully")
    ).resolves.toEqual({
      icon: "MessageSquareText",
      title: "Explain angular momentum carefully",
    });

    const abortError = new Error("aborted");
    isAbortLikeErrorMock.mockReturnValueOnce(true);
    generateTextMock.mockRejectedValueOnce(abortError);
    await expect(generateChatMetadata("Explain torque")).resolves.toBeNull();
  });

  it("logs and falls back when metadata generation throws a real error", async () => {
    const error = new Error("provider failed");
    generateTextMock.mockRejectedValueOnce(error);

    await expect(generateChatMetadata("Explain torque")).resolves.toEqual({
      icon: "MessageSquareText",
      title: "Explain torque",
    });
    expect(logErrorMock).toHaveBeenCalledWith("Failed to generate chat title", {
      error,
    });
  });

  it("returns default thinking messages only when there is text and no abort", async () => {
    await expect(
      generateChatThinkingMessages("Explain torque")
    ).resolves.toEqual([
      "Thinking through the details",
      "Checking the shape of the answer",
      "Putting the pieces together",
      "Finishing the last pass",
    ]);
    await expect(generateChatThinkingMessages("")).resolves.toBeNull();

    const controller = new AbortController();
    controller.abort();
    await expect(
      generateChatThinkingMessages("Explain torque", controller.signal)
    ).resolves.toBeNull();
  });
});
