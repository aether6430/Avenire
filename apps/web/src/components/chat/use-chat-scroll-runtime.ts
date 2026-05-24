import {
  buildChatScrollMetricStyles,
  type ChatScrollBox,
  isChatScrollIntentKey,
  isNearBottom,
  resolveAutoScrollEnabled,
  shouldIgnoreAutoScrollToggle,
} from "@/components/chat/chat-scroll-model";

export const INITIAL_BOTTOM_SCROLL_MESSAGE_THRESHOLD = 8;

export function shouldEnableInitialChatAutoScroll(input: {
  isStreaming: boolean;
  messageCount: number;
}) {
  return (
    input.isStreaming ||
    input.messageCount > INITIAL_BOTTOM_SCROLL_MESSAGE_THRESHOLD
  );
}

interface ChatScrollStyleTarget {
  style: {
    setProperty: (key: string, value: string) => void;
  };
}

interface ChatScrollComputedStyle {
  paddingBottom?: string;
  paddingTop?: string;
}

export interface ChatScrollMetricsContainer
  extends ChatScrollBox,
    ChatScrollStyleTarget {}

export function applyChatScrollMetrics(input: {
  container: ChatScrollMetricsContainer;
  getComputedStyle: (element: unknown) => ChatScrollComputedStyle;
}) {
  const computed = input.getComputedStyle(input.container);
  const styles = buildChatScrollMetricStyles({
    clientHeight: input.container.clientHeight,
    paddingBottom: Number.parseFloat(computed.paddingBottom ?? "") || 0,
    paddingTop: Number.parseFloat(computed.paddingTop ?? "") || 0,
  });

  for (const [key, value] of Object.entries(styles)) {
    input.container.style.setProperty(key, value);
  }
}

export function followChatScrollIfNeeded(input: {
  behavior?: ScrollBehavior;
  container: ChatScrollBox | null;
  isAutoScrollEnabled: boolean;
  isStreaming: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}) {
  if (!(input.container && input.isAutoScrollEnabled) || input.isStreaming) {
    return false;
  }

  if (!isNearBottom(input.container)) {
    return false;
  }

  input.scrollToBottom(input.behavior ?? "auto");
  return true;
}

export function initializeChatScrollState(input: {
  hasInitializedLayout: boolean;
  isStreaming: boolean;
  latestUserMessageId?: string | null;
  messageCount: number;
}) {
  if (input.hasInitializedLayout || input.messageCount === 0) {
    return null;
  }

  return {
    autoScrollEnabled: shouldEnableInitialChatAutoScroll(input),
    hasInitializedLayout: true,
    lastStreamPinnedMessageId: null,
    lastUserMessageId: input.latestUserMessageId ?? null,
    shouldScrollToBottom:
      !input.isStreaming &&
      input.messageCount > INITIAL_BOTTOM_SCROLL_MESSAGE_THRESHOLD,
    shouldScrollToTop:
      !input.isStreaming &&
      input.messageCount <= INITIAL_BOTTOM_SCROLL_MESSAGE_THRESHOLD,
  };
}

export function handleLatestUserMessageForScroll(input: {
  hasInitializedLayout: boolean;
  latestUserMessageId?: string | null;
  lastUserMessageId: string | null;
}) {
  if (
    !(input.hasInitializedLayout && input.latestUserMessageId) ||
    input.latestUserMessageId === input.lastUserMessageId
  ) {
    return null;
  }

  return {
    autoScrollEnabled: true,
    lastStreamPinnedMessageId: null,
    lastUserMessageId: input.latestUserMessageId,
  };
}

export function schedulePinnedLatestChatMessage(input: {
  cancelAnimationFrame: (handle: number) => void;
  isStreaming: boolean;
  lastStreamPinnedMessageId: string | null;
  latestUserMessageId?: string | null;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  scrollToMessageTop: (messageId: string, behavior?: ScrollBehavior) => void;
  wasStreaming: boolean;
}) {
  if (
    !input.isStreaming ||
    input.wasStreaming ||
    !input.latestUserMessageId ||
    input.lastStreamPinnedMessageId === input.latestUserMessageId
  ) {
    return null;
  }

  let secondFrame = 0;
  const firstFrame = input.requestAnimationFrame(() => {
    secondFrame = input.requestAnimationFrame(() => {
      input.scrollToMessageTop(input.latestUserMessageId!, "smooth");
    });
  });

  return {
    cancel() {
      input.cancelAnimationFrame(firstFrame);
      if (secondFrame) {
        input.cancelAnimationFrame(secondFrame);
      }
    },
    lastStreamPinnedMessageId: input.latestUserMessageId,
  };
}

export interface ChatScrollListenerContainer extends ChatScrollBox {
  addEventListener: (
    name: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ) => void;
  removeEventListener: (name: string, listener: EventListener) => void;
}

export function attachChatScrollIntentListeners(input: {
  container: ChatScrollListenerContainer;
  getNow: () => number;
  hasRecentUserIntent: () => boolean;
  markUserIntent: () => void;
  programmaticScrollUntil: number;
  setAutoScrollEnabled: (enabled: boolean) => void;
}) {
  const onWheel = () => {
    input.markUserIntent();
  };

  const onTouchStart = () => {
    input.markUserIntent();
  };

  const onTouchMove = () => {
    input.markUserIntent();
  };

  const onPointerDown = () => {
    input.markUserIntent();
  };

  const onScroll = () => {
    if (
      shouldIgnoreAutoScrollToggle({
        hasRecentUserIntent: input.hasRecentUserIntent(),
        now: input.getNow(),
        programmaticScrollUntil: input.programmaticScrollUntil,
      })
    ) {
      return;
    }

    input.setAutoScrollEnabled(resolveAutoScrollEnabled(input.container));
  };

  const onKeyDown: EventListener = (event) => {
    const key =
      event && typeof event === "object" && "key" in event
        ? (event as { key?: unknown }).key
        : null;
    if (typeof key === "string" && isChatScrollIntentKey(key)) {
      input.markUserIntent();
    }
  };

  input.container.addEventListener("wheel", onWheel, { passive: true });
  input.container.addEventListener("touchstart", onTouchStart, {
    passive: true,
  });
  input.container.addEventListener("touchmove", onTouchMove, {
    passive: true,
  });
  input.container.addEventListener("pointerdown", onPointerDown, {
    passive: true,
  });
  input.container.addEventListener("scroll", onScroll, { passive: true });
  input.container.addEventListener("keydown", onKeyDown);

  return () => {
    input.container.removeEventListener("wheel", onWheel);
    input.container.removeEventListener("touchstart", onTouchStart);
    input.container.removeEventListener("touchmove", onTouchMove);
    input.container.removeEventListener("pointerdown", onPointerDown);
    input.container.removeEventListener("scroll", onScroll);
    input.container.removeEventListener("keydown", onKeyDown);
  };
}
