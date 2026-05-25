import type { UseChatHelpers } from "@ai-sdk/react";
import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import type { RefObject } from "react";
import { getMessageSignature } from "@/components/chat/message-model";

export interface MessagesProps {
  activeReplyMessageId?: string | null;
  agentActivity: AgentActivityData | null;
  bottomSpacerHeight: number;
  chatId: string;
  error: UseChatHelpers<UIMessage>["error"];
  isReadonly: boolean;
  messages: UseChatHelpers<UIMessage>["messages"];
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesContentRef: RefObject<HTMLDivElement | null>;
  onRegenerate: (messageId: string) => void;
  replyMinHeight?: string;
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  status: UseChatHelpers<UIMessage>["status"];
  workspaceUuid: string;
}

export function haveMessagesChanged(
  prevMessages: UseChatHelpers<UIMessage>["messages"],
  nextMessages: UseChatHelpers<UIMessage>["messages"]
) {
  if (prevMessages.length !== nextMessages.length) {
    return true;
  }

  return prevMessages.some(
    (message, index) =>
      getMessageSignature(message) !== getMessageSignature(nextMessages[index]!)
  );
}

export function getAssistantMessageState(
  message: UIMessage,
  input: {
    isStreaming: boolean;
    status: UseChatHelpers<UIMessage>["status"];
  }
) {
  const lastPart = message.parts?.at(-1);
  const lastPartDone =
    !(lastPart && "state" in lastPart) ||
    (lastPart as { state?: string }).state !== "input-streaming";

  return {
    isComplete:
      message.role !== "assistant"
        ? true
        : lastPartDone && !input.isStreaming && input.status !== "submitted",
    isStreaming: input.isStreaming,
  };
}

export function splitTurnMessages(
  messages: UseChatHelpers<UIMessage>["messages"]
) {
  let latestUserMessageIndex = -1;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      latestUserMessageIndex = index;
      break;
    }
  }

  if (latestUserMessageIndex < 0) {
    return {
      lastTurnMessages: [],
      pastTurnMessages: messages,
    };
  }

  return {
    lastTurnMessages: messages.slice(latestUserMessageIndex),
    pastTurnMessages: messages.slice(0, latestUserMessageIndex),
  };
}

const EDGE_MASK_SCROLL_DISTANCE_PX = 44;

export function updateChatEdgeMask(host: HTMLElement, container: HTMLElement) {
  const maxScrollTop = Math.max(
    0,
    container.scrollHeight - container.clientHeight
  );
  if (maxScrollTop === 0) {
    host.style.setProperty("--chat-edge-mask-top", "0");
    host.style.setProperty("--chat-edge-mask-bottom", "0");
    return;
  }

  const scrollTop = container.scrollTop;
  const topOpacity = Math.min(1, scrollTop / EDGE_MASK_SCROLL_DISTANCE_PX);
  const bottomOpacity = Math.min(
    1,
    (maxScrollTop - scrollTop) / EDGE_MASK_SCROLL_DISTANCE_PX
  );

  host.style.setProperty("--chat-edge-mask-top", topOpacity.toFixed(3));
  host.style.setProperty("--chat-edge-mask-bottom", bottomOpacity.toFixed(3));
}

export function areMessagesPropsEqual(
  prevProps: MessagesProps,
  nextProps: MessagesProps
) {
  if (prevProps.chatId !== nextProps.chatId) {
    return false;
  }
  if (prevProps.status !== nextProps.status) {
    return false;
  }
  if (prevProps.bottomSpacerHeight !== nextProps.bottomSpacerHeight) {
    return false;
  }
  if (prevProps.activeReplyMessageId !== nextProps.activeReplyMessageId) {
    return false;
  }
  if (prevProps.isReadonly !== nextProps.isReadonly) {
    return false;
  }
  if (prevProps.workspaceUuid !== nextProps.workspaceUuid) {
    return false;
  }
  if (prevProps.error !== nextProps.error) {
    return false;
  }
  if (prevProps.agentActivity !== nextProps.agentActivity) {
    return false;
  }
  if (prevProps.onRegenerate !== nextProps.onRegenerate) {
    return false;
  }
  if (prevProps.replyMinHeight !== nextProps.replyMinHeight) {
    return false;
  }
  if (prevProps.sendMessage !== nextProps.sendMessage) {
    return false;
  }

  return !haveMessagesChanged(prevProps.messages, nextProps.messages);
}
