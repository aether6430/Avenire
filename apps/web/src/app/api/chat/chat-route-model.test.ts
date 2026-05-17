import type { UIMessage } from "@avenire/ai/message-types";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPromptMemoryBlocks,
  DEFAULT_CHAT_TITLE,
  fallbackChatNameFromText,
  getPersistedMessages,
  getRequiredChatCredits,
  isPromptMemoryBlockArray,
  modelUsesLegacyWidgetSchema,
  normalizeMessageFileMediaTypes,
  pickModelTools,
  resolveTotalTokens,
  sanitizeChatName,
  shouldGenerateTitle,
  stripNonHttpFileParts,
  trimMessagesForModelContext,
} from "@/app/api/chat/chat-route-model";

function buildMessage(
  overrides: Partial<UIMessage> & Pick<UIMessage, "id" | "role">
): UIMessage {
  return {
    id: overrides.id,
    metadata: undefined,
    parts: [],
    role: overrides.role,
    ...overrides,
  } as UIMessage;
}

describe("chat route model", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sanitizes fallback chat titles and decides when titles should regenerate", () => {
    expect(sanitizeChatName(`  "Momentum   review"  `)).toBe("Momentum review");
    expect(
      fallbackChatNameFromText(
        "  Momentum conservation in collisions with external impulses  "
      )
    ).toBe("Momentum conservation in collisions with external");
    expect(fallbackChatNameFromText("   ")).toBe(DEFAULT_CHAT_TITLE);

    expect(
      shouldGenerateTitle(DEFAULT_CHAT_TITLE, [
        buildMessage({
          id: "user-1",
          parts: [{ text: "Momentum review", type: "text" }] as never[],
          role: "user",
        }),
      ])
    ).toBe(true);

    expect(
      shouldGenerateTitle("Momentum review", [
        buildMessage({
          id: "user-1",
          parts: [{ text: " Momentum   review ", type: "text" }] as never[],
          role: "user",
        }),
      ])
    ).toBe(true);
  });

  it("strips non-http file parts and normalizes message file media types", () => {
    const messages = [
      buildMessage({
        id: "message-1",
        parts: [
          {
            mediaType: "image",
            type: "file",
            url: "blob:local-preview",
          },
          {
            mediaType: "video/mp4",
            type: "file",
            url: "https://cdn.example.com/video.mp4",
          },
          { text: "hello", type: "text" },
        ] as never[],
        role: "user",
      }),
    ];

    expect(stripNonHttpFileParts(messages)[0]?.parts).toEqual([
      {
        mediaType: "video/mp4",
        type: "file",
        url: "https://cdn.example.com/video.mp4",
      },
      { text: "hello", type: "text" },
    ]);

    expect(normalizeMessageFileMediaTypes(messages)[0]?.parts).toEqual([
      {
        mediaType: "image/*",
        type: "file",
        url: "blob:local-preview",
      },
      {
        mediaType: "video/mp4",
        type: "file",
        url: "https://cdn.example.com/video.mp4",
      },
      { text: "hello", type: "text" },
    ]);
  });

  it("builds prompt memory blocks and validates their wire shape", () => {
    const blocks = buildPromptMemoryBlocks({
      misconceptionsContext: "Confuses torque with force.",
      sessionSummaryContext: "Reviewed circular motion.",
      studentProfileContext: "Prefers compact explanations.",
      subject: "Physics",
      topic: "Rotation",
    });

    expect(blocks.map((block) => block.kind)).toEqual([
      "subject",
      "session-summary",
      "student-profile",
      "misconception",
    ]);
    expect(blocks[0]?.content).toContain("Detected session subject: Physics.");
    expect(isPromptMemoryBlockArray(blocks)).toBe(true);
    expect(
      isPromptMemoryBlockArray([{ content: "ok", kind: 1 }] as never)
    ).toBe(false);
  });

  it("trims chat context by configured char budget and filters model tools", () => {
    vi.stubEnv("CHAT_CONTEXT_MAX_CHARS", "2001");

    const messages = [
      buildMessage({
        id: "message-1",
        parts: [{ text: "a".repeat(1200), type: "text" }] as never[],
        role: "user",
      }),
      buildMessage({
        id: "message-2",
        parts: [{ text: "b".repeat(1000), type: "text" }] as never[],
        role: "assistant",
      }),
      buildMessage({
        id: "message-3",
        parts: [{ text: "c".repeat(1000), type: "text" }] as never[],
        role: "user",
      }),
    ];

    expect(
      trimMessagesForModelContext(messages).map((message) => message.id)
    ).toEqual(["message-2", "message-3"]);

    expect(
      Object.keys(
        pickModelTools(
          {
            avenire_agent: {},
            note_agent: {},
            unknown_tool: {},
          },
          ["note_agent"]
        )
      )
    ).toEqual(["avenire_agent"]);
    expect(modelUsesLegacyWidgetSchema("apollo-apex")).toBe(true);
  });

  it("resolves total tokens, required credits, and persisted message ordering", () => {
    vi.stubEnv("CHAT_TOKENS_PER_CREDIT", "1000");

    expect(resolveTotalTokens({ inputTokens: 700, outputTokens: 300 })).toBe(
      1000
    );
    expect(resolveTotalTokens({ totalTokens: 2500 })).toBe(2500);
    expect(getRequiredChatCredits(2500)).toBe(3);

    const userMessage = buildMessage({
      id: "user-1",
      parts: [{ text: "Need help", type: "text" }] as never[],
      role: "user",
    });
    const responseMessage = buildMessage({
      id: "assistant-1",
      parts: [{ text: "Sure", type: "text" }] as never[],
      role: "assistant",
    });

    expect(
      getPersistedMessages({
        isContinuation: false,
        originalMessages: [userMessage],
        responseMessage,
        streamedMessages: [responseMessage],
      }).map((message) => message.id)
    ).toEqual(["user-1", "assistant-1"]);
  });
});
