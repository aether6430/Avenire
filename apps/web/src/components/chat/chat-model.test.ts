import type { UIMessage } from "@avenire/ai/message-types";
import { describe, expect, it } from "vitest";

import {
  buildChatSubmissionFileParts,
  createOptimisticUserMessage,
  FAILED_ASSISTANT_REPLY_TEXT,
  getActiveReplyMessageId,
  getChatLayoutState,
  getDisplayedChatMessages,
  getLatestUserMessageId,
} from "@/components/chat/chat-model";

describe("chat model", () => {
  it("builds optimistic user messages only when text or valid files exist", () => {
    expect(createOptimisticUserMessage({ text: "   " })).toBeNull();

    const optimistic = createOptimisticUserMessage({
      files: [
        {
          filename: "doc.pdf",
          mediaType: "application/pdf",
          type: "file",
          url: "https://example.com/doc.pdf",
        },
      ],
      text: "hello",
    });

    expect(optimistic?.role).toBe("user");
    expect(optimistic?.parts).toHaveLength(2);
  });

  it("builds normalized submission file parts from local and workspace attachments", () => {
    const parts = buildChatSubmissionFileParts([
      {
        contentType: "image/png",
        name: "Local image",
        source: "local",
        status: "completed",
        url: "https://example.com/image.png",
      },
      {
        contentType: "application/pdf",
        name: "Workspace pdf",
        source: "workspace",
        status: "completed",
        url: "https://example.com/file.pdf",
      },
      {
        contentType: "text/plain",
        name: "Bad local",
        source: "local",
        status: "completed",
        url: "blob:bad",
      },
    ] as any);

    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({ filename: "Local image", type: "file" });
    expect(parts[1]).toMatchObject({ filename: "Workspace pdf", type: "file" });
  });

  it("derives draft assistant view, latest user id, active reply, and layout state", () => {
    const messages = [
      {
        id: "user-1",
        parts: [{ text: "hello", type: "text" }],
        role: "user",
      },
    ] as UIMessage[];

    const displayed = getDisplayedChatMessages(messages, "submitted");
    expect(displayed).toHaveLength(2);
    expect(getLatestUserMessageId(displayed)).toBe("user-1");
    expect(getActiveReplyMessageId(displayed)).toContain("assistant-draft");

    expect(
      getChatLayoutState({
        displayedMessages: [],
        pendingChatRoute: null,
        status: "ready",
      })
    ).toMatchObject({
      hasConversationSurface: false,
      isEmptyState: true,
      shouldUseCenteredComposerLayout: true,
    });
  });

  it("derives a failed assistant placeholder when a persisted turn ends on a user message", () => {
    const messages = [
      {
        id: "user-1",
        parts: [{ text: "hello", type: "text" }],
        role: "user",
      },
    ] as UIMessage[];

    const displayed = getDisplayedChatMessages(messages, "ready");

    expect(displayed).toHaveLength(2);
    expect(displayed[1]).toMatchObject({
      id: "assistant-error-user-1",
      role: "assistant",
      parts: [{ text: FAILED_ASSISTANT_REPLY_TEXT, type: "text" }],
    });
  });
});
