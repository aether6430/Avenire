import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { ChatMessagesSurfaceMock, useChatMessagesMock } = vi.hoisted(() => ({
  ChatMessagesSurfaceMock: vi.fn(() => <div>MESSAGES_SURFACE</div>),
  useChatMessagesMock: vi.fn(),
}));

vi.mock("@/components/chat/use-chat-messages", () => ({
  useChatMessages: useChatMessagesMock,
}));

vi.mock("@/components/chat/messages-surface", () => ({
  ChatMessagesSurface: ChatMessagesSurfaceMock,
}));

import { Messages } from "@/components/chat/messages";

describe("Messages", () => {
  it("wires the messages runtime into the messages surface", () => {
    const props = {
      activeReplyMessageId: "msg-2",
      agentActivity: null,
      bottomSpacerHeight: 12,
      chatId: "chat-1",
      error: undefined,
      isReadonly: false,
      messages: [],
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

    const html = renderToStaticMarkup(<Messages {...props} />);

    expect(useChatMessagesMock).toHaveBeenCalledWith(props);
    expect(ChatMessagesSurfaceMock).toHaveBeenCalledWith(
      {
        props,
        runtime,
      },
      undefined
    );
    expect(html).toContain("MESSAGES_SURFACE");
  });
});
