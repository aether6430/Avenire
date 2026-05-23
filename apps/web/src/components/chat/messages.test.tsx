import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { ChatMessagesSurfaceMock, useChatMessagesMock } = vi.hoisted(() => ({
  ChatMessagesSurfaceMock: vi.fn(() => <div>MESSAGES_SURFACE</div>),
  useChatMessagesMock: vi.fn(),
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

vi.mock("@/components/chat/multimodal-input", () => ({
  MultimodalInput: () => <div>MULTIMODAL_INPUT</div>,
}));

vi.mock("@/components/chat/overview", () => ({
  Overview: () => <div>OVERVIEW</div>,
}));

vi.mock("@/components/chat/use-chat-messages", () => ({
  useChatMessages: useChatMessagesMock,
}));

vi.mock("@/components/chat/messages-surface", () => ({
  ChatMessagesSurface: ChatMessagesSurfaceMock,
}));

import { ChatSurface } from "@/components/chat/chat-surface";

const removedMessagesWrapperFile = resolve(
  import.meta.dirname,
  "./messages.tsx"
);

describe("ChatSurface messages branch", () => {
  it("wires the messages runtime into the messages surface without the old wrapper file", () => {
    const props = {
      activeReplyMessageId: "msg-2",
      agentActivity: null,
      bottomSpacerHeight: 12,
      chatId: "chat-1",
      displayedMessages: [],
      error: undefined,
      isReadonly: false,
      messagesContainerRef: { current: null },
      messagesContentRef: { current: null },
      onRegenerate: () => {},
      replyMinHeight: "96px",
      sendMessage: async () => undefined,
      status: "ready" as const,
      workspaceUuid: "workspace-1",
    };
    const runtime = {
      lastTurnMessages: [],
      measurePastTurnElement: () => undefined,
      pastTurnMessages: [],
      pastTurnsHeight: 0,
      virtualItems: [],
    };

    useChatMessagesMock.mockReturnValue(runtime);

    const chatSurfaceProps = {
      ...props,
      attachments: [],
      getRootProps: () => ({}),
      handleStop: () => {},
      handleSubmit: async () => undefined,
      input: "",
      isAutoScrollEnabled: true,
      isDragActive: false,
      layoutState: {
        hasConversationSurface: true,
        isEmptyState: false,
        isTransitioningFromNewChat: false,
        shouldUseCenteredComposerLayout: false,
      },
      reenableAutoScroll: () => {},
      setAttachments: () => {},
      setInput: () => {},
      setTurboEnabled: () => {},
      title: "Method",
      turboEnabled: false,
    } as never;

    const html = renderToStaticMarkup(<ChatSurface {...chatSurfaceProps} />);

    expect(useChatMessagesMock).toHaveBeenCalledWith({
      messages: props.displayedMessages,
      messagesContainerRef: props.messagesContainerRef,
      messagesContentRef: props.messagesContentRef,
      status: props.status,
    });
    expect(ChatMessagesSurfaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({
          activeReplyMessageId: "msg-2",
          bottomSpacerHeight: 12,
          chatId: "chat-1",
          isReadonly: false,
          messages: [],
          messagesContainerRef: props.messagesContainerRef,
          messagesContentRef: props.messagesContentRef,
          replyMinHeight: "calc(100dvh - 250px)",
          sendMessage: props.sendMessage,
          status: "ready",
          workspaceUuid: "workspace-1",
        }),
        runtime,
      }),
      undefined
    );
    expect(existsSync(removedMessagesWrapperFile)).toBe(false);
    expect(html).toContain("MESSAGES_SURFACE");
  });
});
