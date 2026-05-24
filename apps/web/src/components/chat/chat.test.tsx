import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { useChatRuntimeMock } = vi.hoisted(() => ({
  useChatRuntimeMock: vi.fn(),
}));

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({ children }: { children?: ReactNode }) => (
    <button>{children}</button>
  ),
}));

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    form: ({ children }: { children?: ReactNode }) => <form>{children}</form>,
  },
}));

vi.mock("@/components/chat/use-chat-runtime", () => ({
  useChatRuntime: useChatRuntimeMock,
}));

vi.mock("@/components/chat/multimodal-input", () => ({
  MultimodalInput: () => <div>MULTIMODAL_INPUT</div>,
}));

vi.mock("@/components/chat/overview", () => ({
  Overview: () => <div>OVERVIEW</div>,
}));

vi.mock("@/components/chat/use-chat-messages", () => ({
  useChatMessages: () => ({
    lastTurnMessages: [],
    measurePastTurnElement: () => undefined,
    pastTurnMessages: [],
    pastTurnsHeight: 0,
    virtualItems: [],
  }),
}));

vi.mock("@/components/chat/messages-surface", () => ({
  ChatMessagesSurface: () => <div>MESSAGES_SURFACE</div>,
}));

import { Chat } from "@/components/chat/chat";

const removedSurfaceFile = resolve(import.meta.dirname, "./chat-surface.tsx");

describe("Chat", () => {
  it("wires the runtime hook directly in the owner file after removing the intermediate surface", () => {
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
    expect(existsSync(removedSurfaceFile)).toBe(false);
    expect(html).toContain("OVERVIEW");
    expect(html).toContain("MULTIMODAL_INPUT");
  });
});
