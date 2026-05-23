import type { UIMessage } from "@avenire/ai/message-types";
import { describe, expect, it } from "vitest";
import {
  buildRegenerationRequest,
  CHAT_RUNTIME_MAX_FILES,
  getAutoPromptToSend,
  getChatAttachmentLimitDescription,
  getChatHandoffMessages,
  getChatStatusPetNotification,
  getCompletedAssistantMessageId,
  shouldHydrateInitialChatMessages,
  shouldResumeChatStream,
  shouldResumeChatStreamOnWindowActivation,
  willExceedChatAttachmentLimit,
} from "@/components/chat/use-chat-runtime-model";

describe("use chat runtime model", () => {
  it("prefers pending handoff messages when they are longer than current messages", () => {
    const currentMessages = [
      { id: "a", parts: [], role: "user" },
    ] as UIMessage[];
    const pendingMessages = [
      { id: "a", parts: [], role: "user" },
      { id: "b", parts: [], role: "assistant" },
    ] as UIMessage[];

    expect(
      getChatHandoffMessages({
        currentMessages,
        pendingMessages,
      })
    ).toEqual(pendingMessages);
  });

  it("returns an auto prompt only for a fresh ready chat without messages", () => {
    expect(
      getAutoPromptToSend({
        chatId: "new",
        initialPrompt: "  focus on algebra  ",
        lastAutoPrompt: null,
        messageCount: 0,
        status: "ready",
      })
    ).toBe("focus on algebra");

    expect(
      getAutoPromptToSend({
        chatId: "new",
        initialPrompt: "focus on algebra",
        lastAutoPrompt: "focus on algebra",
        messageCount: 0,
        status: "ready",
      })
    ).toBeNull();
  });

  it("builds a regeneration request from the user message before the target assistant reply", () => {
    const messages = [
      {
        id: "u1",
        parts: [
          { text: "Explain Gauss law", type: "text" },
          {
            filename: "note.pdf",
            mediaType: "application/pdf",
            type: "file",
            url: "https://example.com/note.pdf",
          },
        ],
        role: "user",
      },
      {
        id: "a1",
        parts: [{ text: "Answer", type: "text" }],
        role: "assistant",
      },
    ] as UIMessage[];

    expect(buildRegenerationRequest(messages, "a1")).toEqual({
      message: {
        files: [
          {
            filename: "note.pdf",
            mediaType: "application/pdf",
            type: "file",
            url: "https://example.com/note.pdf",
          },
        ],
        text: "Explain Gauss law",
      },
      preservedMessages: [],
    });
  });

  it("keeps attachment-limit messaging explicit", () => {
    expect(
      willExceedChatAttachmentLimit({
        currentCount: 2,
        incomingCount: 2,
      })
    ).toBe(true);
    expect(getChatAttachmentLimitDescription()).toBe(
      `You can only upload up to ${CHAT_RUNTIME_MAX_FILES} files per message.`
    );
  });

  it("keeps initial-message hydration and stream resume rules explicit", () => {
    expect(
      shouldHydrateInitialChatMessages({
        initialMessageCount: 1,
        messageCount: 0,
      })
    ).toBe(true);
    expect(
      shouldHydrateInitialChatMessages({
        initialMessageCount: 1,
        messageCount: 2,
      })
    ).toBe(false);
    expect(shouldResumeChatStream("new")).toBe(false);
    expect(shouldResumeChatStream("chat-1")).toBe(true);
    expect(
      shouldResumeChatStreamOnWindowActivation({
        chatId: "new",
        visibilityState: "visible",
      })
    ).toBe(false);
    expect(
      shouldResumeChatStreamOnWindowActivation({
        chatId: "chat-1",
        visibilityState: "hidden",
      })
    ).toBe(false);
    expect(
      shouldResumeChatStreamOnWindowActivation({
        chatId: "chat-1",
        visibilityState: "visible",
      })
    ).toBe(true);
  });

  it("derives the submitted pet notification and completed assistant reply id", () => {
    expect(getChatStatusPetNotification("submitted")).toEqual({
      animation: "waiting",
      durationMs: 1800,
      message: "Thinking",
      tone: "working",
    });
    expect(getChatStatusPetNotification("ready")).toBeNull();

    expect(
      getCompletedAssistantMessageId({
        lastCompletedMessageId: null,
        messages: [
          { id: "u1", parts: [], role: "user" },
          { id: "a1", parts: [], role: "assistant" },
        ] as UIMessage[],
        previousStatus: "streaming",
        status: "ready",
      })
    ).toBe("a1");

    expect(
      getCompletedAssistantMessageId({
        lastCompletedMessageId: "a1",
        messages: [
          { id: "u1", parts: [], role: "user" },
          { id: "a1", parts: [], role: "assistant" },
        ] as UIMessage[],
        previousStatus: "streaming",
        status: "ready",
      })
    ).toBeNull();
  });
});
