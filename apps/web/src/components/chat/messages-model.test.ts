import type { UIMessage } from "@avenire/ai/message-types";
import { describe, expect, it } from "vitest";

import {
  areMessagesPropsEqual,
  getAssistantMessageState,
  splitTurnMessages,
  updateChatEdgeMask,
} from "@/components/chat/messages-model";

describe("chat messages model", () => {
  it("splits past turns from the latest user turn and derives assistant message state", () => {
    const messages = [
      { id: "m-1", role: "assistant", parts: [] },
      { id: "m-2", role: "user", parts: [] },
      {
        id: "m-3",
        role: "assistant",
        parts: [{ state: "input-streaming", type: "text" }],
      },
    ] as UIMessage[];

    expect(splitTurnMessages(messages)).toEqual({
      lastTurnMessages: messages.slice(1),
      pastTurnMessages: messages.slice(0, 1),
    });

    expect(
      getAssistantMessageState(messages[0]!, {
        isStreaming: false,
        status: "ready",
      })
    ).toEqual({
      isComplete: true,
      isStreaming: false,
    });

    expect(
      getAssistantMessageState(messages[2]!, {
        isStreaming: true,
        status: "streaming",
      })
    ).toEqual({
      isComplete: false,
      isStreaming: true,
    });
  });

  it("updates edge-mask CSS vars and keeps memo equality stable when message signatures do not change", () => {
    const styleValues = new Map<string, string>();
    const host = {
      style: {
        getPropertyValue(name: string) {
          return styleValues.get(name) ?? "";
        },
        setProperty(name: string, value: string) {
          styleValues.set(name, value);
        },
      },
    } as unknown as HTMLElement;
    const container = {
      clientHeight: 100,
      scrollHeight: 300,
      scrollTop: 44,
    } as HTMLElement;

    updateChatEdgeMask(host, container);
    expect(host.style.getPropertyValue("--chat-edge-mask-top")).toBe("1.000");
    expect(host.style.getPropertyValue("--chat-edge-mask-bottom")).toBe(
      "1.000"
    );

    const sharedProps = {
      activeReplyMessageId: "msg-2",
      agentActivity: null,
      bottomSpacerHeight: 12,
      chatId: "chat-1",
      error: undefined,
      isReadonly: false,
      messages: [
        { id: "msg-1", parts: [{ text: "hello", type: "text" }], role: "user" },
      ] as UIMessage[],
      messagesContainerRef: { current: null },
      messagesContentRef: { current: null },
      onRegenerate: () => undefined,
      replyMinHeight: "96px",
      sendMessage: async () => undefined,
      status: "ready" as const,
      workspaceUuid: "workspace-1",
    };

    expect(
      areMessagesPropsEqual(sharedProps, {
        ...sharedProps,
        messages: [
          {
            id: "msg-1",
            parts: [{ text: "hello", type: "text" }],
            role: "user",
          },
        ] as UIMessage[],
      })
    ).toBe(true);

    expect(
      areMessagesPropsEqual(sharedProps, {
        ...sharedProps,
        status: "streaming" as const,
      })
    ).toBe(false);
  });
});
