import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { ChatSurfaceMock, useChatRuntimeMock } = vi.hoisted(() => ({
  ChatSurfaceMock: vi.fn(() => <div>CHAT_SURFACE</div>),
  useChatRuntimeMock: vi.fn(),
}));

vi.mock("@/components/chat/use-chat-runtime", () => ({
  useChatRuntime: useChatRuntimeMock,
}));

vi.mock("@/components/chat/chat-surface", () => ({
  ChatSurface: ChatSurfaceMock,
}));

import { Chat } from "@/components/chat/chat";

describe("Chat", () => {
  it("wires the runtime hook into the chat surface", () => {
    useChatRuntimeMock.mockReturnValue({
      activeReplyMessageId: null,
      agentActivity: null,
      attachments: [],
      bottomSpacerHeight: 0,
      chatId: "chat-1",
      displayedMessages: [],
      error: undefined,
      getRootProps: () => ({}),
      handleStop: () => {},
      handleSubmit: async () => {},
      input: "",
      isAutoScrollEnabled: true,
      isDragActive: false,
      layoutState: {
        hasConversationSurface: false,
        isEmptyState: true,
        isTransitioningFromNewChat: false,
        shouldUseCenteredComposerLayout: true,
      },
      messagesContainerRef: { current: null },
      messagesContentRef: { current: null },
      reenableAutoScroll: () => {},
      regenerateFromMessage: async () => {},
      sendMessage: async () => {},
      setAttachments: () => {},
      setInput: () => {},
      setTurboEnabled: () => {},
      status: "ready",
      turboEnabled: false,
      workspaceUuid: "workspace-1",
    });

    const html = renderToStaticMarkup(
      <Chat
        id="chat-1"
        initialMessages={[]}
        initialPrompt="hello"
        isReadonly={false}
        selectedModel="apollo-apex"
        title="Method"
        userName="Ada"
        workspaceUuid="workspace-1"
      />
    );

    expect(useChatRuntimeMock).toHaveBeenCalledWith({
      id: "chat-1",
      initialMessages: [],
      initialPrompt: "hello",
      selectedModel: "apollo-apex",
      workspaceUuid: "workspace-1",
    });
    expect(ChatSurfaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isReadonly: false,
        title: "Method",
        userName: "Ada",
      }),
      undefined
    );
    expect(html).toContain("CHAT_SURFACE");
  });
});
