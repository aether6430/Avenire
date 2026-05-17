import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendDroppedChatAttachments,
  flushChatRuntimeAutoPrompt,
  flushPendingChatRuntimeRoute,
  handleChatRuntimeDataPart,
  primeChatRuntimeHandoff,
  publishChatRuntimeStatus,
  publishCompletedChatRuntimeReply,
  regenerateChatRuntimeMessage,
  resolveChatRuntimeFollowBehavior,
  resolveChatRuntimeHydration,
  sendChatRuntimeMessage,
  shouldClearChatRuntimeAgentActivity,
} from "@/components/chat/use-chat-runtime-runtime";

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

describe("use chat runtime runtime", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("routes chat-created, chat-name, and agent-activity data parts only when payloads are valid", () => {
    const onChatCreated = vi.fn();
    const onChatName = vi.fn();
    const onAgentActivity = vi.fn();

    handleChatRuntimeDataPart({
      dataPart: {
        data: { fromId: "new", id: "chat-1", title: "Momentum" },
        type: "data-chatCreated",
      },
      onAgentActivity,
      onChatCreated,
      onChatName,
    });
    handleChatRuntimeDataPart({
      dataPart: {
        data: { id: "chat-1", name: "Momentum review" },
        type: "data-chatName",
      },
      onAgentActivity,
      onChatCreated,
      onChatName,
    });

    const activity = { stage: "searching" } as AgentActivityData;
    handleChatRuntimeDataPart({
      dataPart: {
        data: activity,
        type: "data-agent_activity",
      },
      onAgentActivity,
      onChatCreated,
      onChatName,
    });
    handleChatRuntimeDataPart({
      dataPart: {
        data: { id: "", title: "ignored" },
        type: "data-chatCreated",
      },
      onAgentActivity,
      onChatCreated,
      onChatName,
    });

    expect(onChatCreated).toHaveBeenCalledWith({
      fromId: "new",
      id: "chat-1",
      title: "Momentum",
    });
    expect(onChatName).toHaveBeenCalledWith({
      id: "chat-1",
      name: "Momentum review",
    });
    expect(onAgentActivity).toHaveBeenCalledWith(activity);
    expect(onChatCreated).toHaveBeenCalledTimes(1);
  });

  it("primes optimistic pending messages for new chats and clears them when append fails before route handoff", async () => {
    const append = vi.fn().mockRejectedValue(new Error("send failed"));
    const setPendingNewChatMessages = vi.fn();
    const optimisticMessage = buildMessage({
      id: "user-optimistic",
      parts: [{ text: "Hello", type: "text" }] as never[],
      role: "user",
    });

    await expect(
      sendChatRuntimeMessage({
        append,
        chatId: "new",
        createOptimisticUserMessage: vi.fn(() => optimisticMessage),
        currentMessages: [
          buildMessage({ id: "assistant-1", role: "assistant" }),
        ],
        message: { text: "Hello" },
        pendingChatRouteId: null,
        setPendingNewChatMessages,
      })
    ).rejects.toThrow("send failed");

    expect(setPendingNewChatMessages).toHaveBeenNthCalledWith(1, [
      buildMessage({ id: "assistant-1", role: "assistant" }),
      optimisticMessage,
    ]);
    expect(setPendingNewChatMessages).toHaveBeenNthCalledWith(2, null);
  });

  it("does not clear pending new-chat messages after failure once a route handoff already exists", async () => {
    const append = vi.fn().mockRejectedValue(new Error("send failed"));
    const setPendingNewChatMessages = vi.fn();

    await expect(
      sendChatRuntimeMessage({
        append,
        chatId: "new",
        createOptimisticUserMessage: vi.fn(() =>
          buildMessage({ id: "user-1", role: "user" })
        ),
        currentMessages: [],
        message: { text: "Hello" },
        pendingChatRouteId: "chat-2",
        setPendingNewChatMessages,
      })
    ).rejects.toThrow("send failed");

    expect(setPendingNewChatMessages).toHaveBeenCalledTimes(1);
  });

  it("regenerates from a prior assistant message and restores messages on failure", async () => {
    const messages = [
      buildMessage({
        id: "user-1",
        parts: [{ text: "Explain Gauss law", type: "text" }] as never[],
        role: "user",
      }),
      buildMessage({
        id: "assistant-1",
        parts: [{ text: "Initial answer", type: "text" }] as never[],
        role: "assistant",
      }),
    ];
    const setMessages = vi.fn();
    const sendMessage = vi
      .fn()
      .mockRejectedValue(new Error("regenerate failed"));
    const handleError = vi.fn();
    const buildRegenerationRequest = vi.fn(() => ({
      message: { text: "Explain Gauss law" },
      preservedMessages: [],
    }));

    await regenerateChatRuntimeMessage({
      assistantMessageId: "assistant-1",
      buildRegenerationRequest,
      handleError,
      messages,
      sendMessage,
      setMessages,
      status: "ready",
    });

    expect(setMessages).toHaveBeenNthCalledWith(1, []);
    expect(setMessages).toHaveBeenNthCalledWith(2, messages);
    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("flushes pending chat routes only when a chat id is waiting", () => {
    const clearPendingChatRoute = vi.fn();
    const clearPendingNewChatMessages = vi.fn();
    const primeNewChatHandoff = vi.fn();
    const replaceRoute = vi.fn();

    expect(
      flushPendingChatRuntimeRoute({
        clearPendingChatRoute,
        clearPendingNewChatMessages,
        pendingChatRouteId: null,
        primeNewChatHandoff,
        replaceRoute,
      })
    ).toBe(false);

    expect(
      flushPendingChatRuntimeRoute({
        clearPendingChatRoute,
        clearPendingNewChatMessages,
        pendingChatRouteId: "chat-7",
        primeNewChatHandoff,
        replaceRoute,
      })
    ).toBe(true);
    expect(primeNewChatHandoff).toHaveBeenCalledWith("chat-7");
    expect(replaceRoute).toHaveBeenCalledWith("/workspace/chats/chat-7");
    expect(clearPendingChatRoute).toHaveBeenCalledTimes(1);
    expect(clearPendingNewChatMessages).toHaveBeenCalledTimes(1);
  });

  it("primes chat handoff messages only when a target chat and handoff messages exist", () => {
    const getChatHandoffMessages = vi.fn(() => [
      buildMessage({ id: "user-1", role: "user" }),
    ]);
    const primeMessages = vi.fn();

    expect(
      primeChatRuntimeHandoff({
        chatId: null,
        currentMessages: [],
        getChatHandoffMessages,
        pendingMessages: null,
        primeMessages,
      })
    ).toBe(false);

    expect(
      primeChatRuntimeHandoff({
        chatId: "chat-8",
        currentMessages: [],
        getChatHandoffMessages,
        pendingMessages: null,
        primeMessages,
      })
    ).toBe(true);
    expect(primeMessages).toHaveBeenCalledWith("chat-8", [
      buildMessage({ id: "user-1", role: "user" }),
    ]);
  });

  it("publishes stream status, ready completion, and pet notifications deterministically", () => {
    const emitPetNotification = vi.fn();
    const onFinished = vi.fn();
    const onStatus = vi.fn();
    const getChatStatusPetNotification = vi.fn((status: string) =>
      status === "submitted"
        ? {
            animation: "waiting",
            durationMs: 1800,
            message: "Thinking",
            tone: "working",
          }
        : null
    );

    publishChatRuntimeStatus({
      chatId: "chat-1",
      emitPetNotification,
      getChatStatusPetNotification: getChatStatusPetNotification as never,
      onFinished,
      onStatus,
      status: "submitted",
    });
    publishChatRuntimeStatus({
      chatId: "chat-1",
      emitPetNotification,
      getChatStatusPetNotification: getChatStatusPetNotification as never,
      onFinished,
      onStatus,
      status: "ready",
    });

    expect(onStatus).toHaveBeenNthCalledWith(1, {
      chatId: "chat-1",
      status: "submitted",
    });
    expect(onStatus).toHaveBeenNthCalledWith(2, {
      chatId: "chat-1",
      status: "ready",
    });
    expect(emitPetNotification).toHaveBeenCalledWith({
      animation: "waiting",
      durationMs: 1800,
      message: "Thinking",
      tone: "working",
    });
    expect(onFinished).toHaveBeenCalledWith({ chatId: "chat-1" });
  });

  it("appends dropped attachments within the limit and returns an error description when exceeding it", () => {
    const first = { id: "attachment-1" } as never;
    const second = { id: "attachment-2" } as never;

    expect(
      appendDroppedChatAttachments({
        createLocalAttachment: vi
          .fn()
          .mockReturnValueOnce(first)
          .mockReturnValueOnce(second),
        currentAttachments: [{ id: "existing" } as never],
        files: [{ name: "a" } as File, { name: "b" } as File],
        getChatAttachmentLimitDescription: () => "limit hit",
        willExceedChatAttachmentLimit: () => false,
      })
    ).toEqual({
      attachments: [{ id: "existing" }, first, second],
      errorDescription: null,
    });

    expect(
      appendDroppedChatAttachments({
        createLocalAttachment: vi.fn(),
        currentAttachments: [{ id: "existing" } as never],
        files: [{ name: "a" } as File],
        getChatAttachmentLimitDescription: () => "limit hit",
        willExceedChatAttachmentLimit: () => true,
      })
    ).toEqual({
      attachments: [{ id: "existing" }],
      errorDescription: "limit hit",
    });
  });

  it("flushes auto prompts only for new chats and clears the remembered prompt after failure", async () => {
    const setLastAutoPrompt = vi.fn();
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const getAutoPromptToSend = vi.fn(() => "Focus on algebra");

    expect(
      await flushChatRuntimeAutoPrompt({
        chatId: "existing-chat",
        getAutoPromptToSend: getAutoPromptToSend as never,
        initialPrompt: "Focus on algebra",
        lastAutoPrompt: "old",
        messageCount: 0,
        sendMessage,
        setLastAutoPrompt,
        status: "ready",
      })
    ).toBe(false);
    expect(setLastAutoPrompt).toHaveBeenCalledWith(null);

    expect(
      await flushChatRuntimeAutoPrompt({
        chatId: "new",
        getAutoPromptToSend: getAutoPromptToSend as never,
        initialPrompt: "Focus on algebra",
        lastAutoPrompt: null,
        messageCount: 0,
        sendMessage,
        setLastAutoPrompt,
        status: "ready",
      })
    ).toBe(true);
    expect(setLastAutoPrompt).toHaveBeenCalledWith("Focus on algebra");
    expect(sendMessage).toHaveBeenCalledWith({ text: "Focus on algebra" });

    const failingSendMessage = vi
      .fn()
      .mockRejectedValue(new Error("auto prompt failed"));
    expect(
      await flushChatRuntimeAutoPrompt({
        chatId: "new",
        getAutoPromptToSend: getAutoPromptToSend as never,
        initialPrompt: "Focus on algebra",
        lastAutoPrompt: null,
        messageCount: 0,
        sendMessage: failingSendMessage,
        setLastAutoPrompt,
        status: "ready",
      })
    ).toBe(false);
    expect(setLastAutoPrompt).toHaveBeenLastCalledWith(null);
  });

  it("publishes completed replies only once when the status transition warrants it", () => {
    const onCompleted = vi.fn();
    const getCompletedAssistantMessageId = vi.fn((input) =>
      input.previousStatus === "streaming" ? "assistant-2" : null
    );

    expect(
      publishCompletedChatRuntimeReply({
        getCompletedAssistantMessageId: getCompletedAssistantMessageId as never,
        lastCompletedMessageId: null,
        messages: [buildMessage({ id: "assistant-2", role: "assistant" })],
        onCompleted,
        previousStatus: "streaming",
        status: "ready",
      })
    ).toBe("assistant-2");
    expect(onCompleted).toHaveBeenCalledWith("assistant-2");

    expect(
      publishCompletedChatRuntimeReply({
        getCompletedAssistantMessageId: getCompletedAssistantMessageId as never,
        lastCompletedMessageId: "assistant-2",
        messages: [buildMessage({ id: "assistant-2", role: "assistant" })],
        onCompleted,
        previousStatus: "ready",
        status: "ready",
      })
    ).toBe("assistant-2");
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it("resolves hydration, follow behavior, and submitted-status agent resets deterministically", () => {
    const initialMessages = [buildMessage({ id: "user-1", role: "user" })];

    expect(
      resolveChatRuntimeHydration({
        initialMessages,
        messageCount: 0,
        shouldHydrateInitialChatMessages: vi.fn(() => true),
      })
    ).toBe(initialMessages);
    expect(
      resolveChatRuntimeHydration({
        initialMessages,
        messageCount: 2,
        shouldHydrateInitialChatMessages: vi.fn(() => false),
      })
    ).toBeNull();

    expect(
      resolveChatRuntimeFollowBehavior({
        displayedMessageCount: 0,
        status: "ready",
      })
    ).toBeNull();
    expect(
      resolveChatRuntimeFollowBehavior({
        displayedMessageCount: 3,
        status: "submitted",
      })
    ).toBe("smooth");
    expect(
      resolveChatRuntimeFollowBehavior({
        displayedMessageCount: 3,
        status: "ready",
      })
    ).toBe("auto");

    expect(shouldClearChatRuntimeAgentActivity("submitted")).toBe(true);
    expect(shouldClearChatRuntimeAgentActivity("ready")).toBe(false);
  });
});
