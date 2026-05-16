import type { UIMessage } from "@avenire/ai/message-types";
import { describe, expect, it } from "vitest";

import {
  buildChatWorkspaceRoute,
  resolveChatWorkspaceInitialMessages,
  resolveChatWorkspaceMeta,
  shouldLoadChatShareSuggestions,
} from "@/components/dashboard/chat-workspace-model";

describe("chat workspace model", () => {
  it("prefers initial messages, falls back to pending handoff state, and resolves route/meta helpers", () => {
    const initialMessages = [{ id: "msg-1", role: "assistant" }] as UIMessage[];
    const pendingMessages = [{ id: "msg-2", role: "user" }] as UIMessage[];

    expect(
      resolveChatWorkspaceInitialMessages({
        initialMessages,
        pendingMessages,
      })
    ).toBe(initialMessages);

    expect(
      resolveChatWorkspaceInitialMessages({
        initialMessages: [],
        pendingMessages,
      })
    ).toBe(pendingMessages);

    expect(
      buildChatWorkspaceRoute({
        currentChatSlug: "chat-123",
        pathname: "/workspace/chats/new",
      })
    ).toBe("/workspace/chats/chat-123");

    expect(
      buildChatWorkspaceRoute({
        currentChatSlug: "new",
        pathname: "/workspace/chats/new",
      })
    ).toBe("/workspace/chats/new");

    expect(
      resolveChatWorkspaceMeta({
        chatIcon: "sparkles",
        chatMetaOverride: {
          icon: "rocket",
          slug: "chat-123",
          title: "Renamed chat",
        },
        chatTitle: "Original title",
        currentChatSlug: "chat-123",
      })
    ).toEqual({
      icon: "rocket",
      title: "Renamed chat",
    });

    expect(
      resolveChatWorkspaceMeta({
        chatIcon: "sparkles",
        chatMetaOverride: {
          icon: "rocket",
          slug: "other-chat",
          title: "Wrong chat",
        },
        chatTitle: "Original title",
        currentChatSlug: "chat-123",
      })
    ).toEqual({
      icon: "sparkles",
      title: "Original title",
    });
  });

  it("only loads share suggestions when the dialog is open for a persisted chat with non-empty input", () => {
    expect(
      shouldLoadChatShareSuggestions({
        currentChatSlug: "chat-123",
        isShareDialogOpen: true,
        shareEmail: "  ada@example.com  ",
      })
    ).toBe(true);

    expect(
      shouldLoadChatShareSuggestions({
        currentChatSlug: "new",
        isShareDialogOpen: true,
        shareEmail: "ada@example.com",
      })
    ).toBe(false);

    expect(
      shouldLoadChatShareSuggestions({
        currentChatSlug: "chat-123",
        isShareDialogOpen: false,
        shareEmail: "ada@example.com",
      })
    ).toBe(false);
  });
});
