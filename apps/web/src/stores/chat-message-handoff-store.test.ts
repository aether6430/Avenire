import type { UIMessage } from "@avenire/ai/message-types";
import { beforeEach, describe, expect, it } from "vitest";
import {
  chatMessageHandoffActions,
  useChatMessageHandoffStore,
} from "@/stores/chat-message-handoff-store";

function buildMessage(id: string): UIMessage {
  return {
    id,
    metadata: undefined,
    parts: [],
    role: "user",
  } as UIMessage;
}

describe("chat message handoff store", () => {
  beforeEach(() => {
    useChatMessageHandoffStore.setState({ messagesByChatId: {} });
  });

  it("primes, consumes, and clears chat handoff messages conservatively", () => {
    expect(chatMessageHandoffActions.consume("chat-1")).toBeNull();

    chatMessageHandoffActions.prime("chat-1", [buildMessage("message-1")]);
    expect(
      useChatMessageHandoffStore.getState().messagesByChatId["chat-1"]
    ).toHaveLength(1);

    expect(chatMessageHandoffActions.consume("chat-1")).toEqual([
      buildMessage("message-1"),
    ]);
    expect(
      useChatMessageHandoffStore.getState().messagesByChatId["chat-1"]
    ).toBeUndefined();

    chatMessageHandoffActions.prime("chat-2", [buildMessage("message-2")]);
    chatMessageHandoffActions.clear("chat-2");
    expect(
      useChatMessageHandoffStore.getState().messagesByChatId["chat-2"]
    ).toBeUndefined();
  });

  it("fails closed for empty chat ids or empty message lists", () => {
    chatMessageHandoffActions.prime("", [buildMessage("message-1")]);
    chatMessageHandoffActions.prime("chat-1", []);

    expect(useChatMessageHandoffStore.getState().messagesByChatId).toEqual({});
  });
});
