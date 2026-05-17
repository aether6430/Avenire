"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  buildChatScrollMetricStyles,
  escapeChatScrollSelectorValue,
  getBottomScrollTop,
  isChatScrollIntentKey,
  isNearBottom,
  LAYOUT_SETTLE_MS,
  PROGRAMMATIC_SCROLL_GRACE_MS,
  resolveAutoScrollEnabled,
  shouldIgnoreAutoScrollToggle,
  TOP_ANCHOR_OFFSET_PX,
  USER_SCROLL_INTENT_WINDOW_MS,
} from "@/components/chat/chat-scroll-model";

function updateScrollMetrics(container: HTMLElement) {
  const computed = window.getComputedStyle(container);
  const styles = buildChatScrollMetricStyles({
    clientHeight: container.clientHeight,
    paddingBottom: Number.parseFloat(computed.paddingBottom) || 0,
    paddingTop: Number.parseFloat(computed.paddingTop) || 0,
  });

  for (const [key, value] of Object.entries(styles)) {
    container.style.setProperty(key, value);
  }
}

export function useChatScroll(options: {
  isStreaming: boolean;
  latestUserMessageId?: string | null;
  messageCount: number;
}): {
  bottomSpacerHeight: number;
  containerRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  followIfNeeded: (behavior?: ScrollBehavior) => void;
  isAutoScrollEnabled: boolean;
  reenableAutoScroll: (behavior?: ScrollBehavior) => void;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  scrollToMessageTop: (messageId: string, behavior?: ScrollBehavior) => void;
} {
  const { isStreaming, latestUserMessageId, messageCount } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const observedContainerRef = useRef<HTMLDivElement | null>(null);
  const detachListenerRef = useRef<(() => void) | null>(null);
  const settleObserverRef = useRef<ResizeObserver | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousStreamingRef = useRef(isStreaming);
  const hasInitializedLayoutRef = useRef(false);
  const lastUserMessageIdRef = useRef<string | null>(null);
  const lastStreamPinnedMessageIdRef = useRef<string | null>(null);
  const programmaticScrollUntilRef = useRef(0);
  const userIntentUntilRef = useRef(0);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const isAutoScrollEnabledRef = useRef(isAutoScrollEnabled);

  useEffect(() => {
    isAutoScrollEnabledRef.current = isAutoScrollEnabled;
  }, [isAutoScrollEnabled]);

  const clearSettleObserver = useCallback(() => {
    if (settleObserverRef.current) {
      settleObserverRef.current.disconnect();
      settleObserverRef.current = null;
    }
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const markProgrammaticScroll = useCallback(() => {
    programmaticScrollUntilRef.current =
      Date.now() + PROGRAMMATIC_SCROLL_GRACE_MS;
  }, []);

  const markUserIntent = useCallback(() => {
    userIntentUntilRef.current = Date.now() + USER_SCROLL_INTENT_WINDOW_MS;
  }, []);

  const hasRecentUserIntent = useCallback(() => {
    return Date.now() < userIntentUntilRef.current;
  }, []);

  const getMessageElement = useCallback((messageId: string) => {
    const container = containerRef.current;
    if (!container) {
      return null;
    }

    return container.querySelector<HTMLElement>(
      `[data-message-id="${escapeChatScrollSelectorValue(messageId)}"]`
    );
  }, []);

  const scrollToMessageTop = useCallback(
    (messageId: string, behavior: ScrollBehavior = "smooth") => {
      const container = containerRef.current;
      const message = getMessageElement(messageId);
      if (!(container && message)) {
        return;
      }

      markProgrammaticScroll();

      const containerTop = container.getBoundingClientRect().top;
      const messageTop = message.getBoundingClientRect().top;
      const delta = messageTop - containerTop - TOP_ANCHOR_OFFSET_PX;

      container.scrollTo({
        behavior,
        top: Math.max(0, container.scrollTop + delta),
      });
    },
    [getMessageElement, markProgrammaticScroll]
  );

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      markProgrammaticScroll();
      container.scrollTo({
        behavior,
        top: getBottomScrollTop(container),
      });
    },
    [markProgrammaticScroll]
  );

  const _pinMessageDuringSettle = useCallback(
    (messageId: string, initialBehavior: ScrollBehavior = "auto") => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!(container && content)) {
        return;
      }

      clearSettleObserver();

      let isInitialPin = true;
      const pin = () => {
        scrollToMessageTop(messageId, isInitialPin ? initialBehavior : "auto");
        isInitialPin = false;
      };

      pin();

      const resizeObserver = new ResizeObserver(() => {
        pin();
      });

      resizeObserver.observe(container);
      resizeObserver.observe(content);
      Array.from(content.children).forEach((child) => {
        resizeObserver.observe(child);
      });

      settleObserverRef.current = resizeObserver;
      settleTimerRef.current = setTimeout(() => {
        clearSettleObserver();
      }, LAYOUT_SETTLE_MS);
    },
    [clearSettleObserver, scrollToMessageTop]
  );

  const followIfNeeded = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const container = containerRef.current;
      if (!(container && isAutoScrollEnabledRef.current)) {
        return;
      }

      if (isStreaming) {
        return;
      }

      if (isNearBottom(container)) {
        scrollToBottom(behavior);
      }
    },
    [isStreaming, scrollToBottom]
  );

  const reenableAutoScroll = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      isAutoScrollEnabledRef.current = true;
      setIsAutoScrollEnabled(true);
      scrollToBottom(behavior);
    },
    [scrollToBottom]
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    updateScrollMetrics(container);

    const resizeObserver = new ResizeObserver(() => {
      updateScrollMetrics(container);
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      if (!isAutoScrollEnabledRef.current) {
        return;
      }

      if (isStreaming) {
        scrollToBottom("auto");
        return;
      }

      followIfNeeded("auto");
    });

    resizeObserver.observe(content);

    return () => {
      resizeObserver.disconnect();
    };
  }, [followIfNeeded, isStreaming, scrollToBottom]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || hasInitializedLayoutRef.current || messageCount === 0) {
      return;
    }

    hasInitializedLayoutRef.current = true;

    if (latestUserMessageId) {
      lastUserMessageIdRef.current = latestUserMessageId;
      lastStreamPinnedMessageIdRef.current = null;
    }

    if (!isStreaming) {
      scrollToBottom("auto");
    }
  }, [isStreaming, latestUserMessageId, messageCount, scrollToBottom]);

  useLayoutEffect(() => {
    if (
      !(hasInitializedLayoutRef.current && latestUserMessageId) ||
      latestUserMessageId === lastUserMessageIdRef.current
    ) {
      return;
    }

    lastUserMessageIdRef.current = latestUserMessageId;
    lastStreamPinnedMessageIdRef.current = null;
    isAutoScrollEnabledRef.current = true;
    setIsAutoScrollEnabled(true);
  }, [latestUserMessageId]);

  useLayoutEffect(() => {
    const wasStreaming = previousStreamingRef.current;
    previousStreamingRef.current = isStreaming;

    if (
      !isStreaming ||
      wasStreaming ||
      !latestUserMessageId ||
      lastStreamPinnedMessageIdRef.current === latestUserMessageId
    ) {
      return;
    }

    lastStreamPinnedMessageIdRef.current = latestUserMessageId;

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        scrollToMessageTop(latestUserMessageId, "smooth");
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) {
        window.cancelAnimationFrame(secondFrame);
      }
    };
  }, [isStreaming, latestUserMessageId, scrollToMessageTop]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === observedContainerRef.current) {
      return;
    }

    if (detachListenerRef.current) {
      detachListenerRef.current();
      detachListenerRef.current = null;
    }

    observedContainerRef.current = container;
    if (!container) {
      return;
    }

    const onWheel = () => {
      markUserIntent();
    };

    const onTouchStart = () => {
      markUserIntent();
    };

    const onTouchMove = () => {
      markUserIntent();
    };

    const onPointerDown = () => {
      markUserIntent();
    };

    const onScroll = () => {
      if (
        shouldIgnoreAutoScrollToggle({
          hasRecentUserIntent: hasRecentUserIntent(),
          now: Date.now(),
          programmaticScrollUntil: programmaticScrollUntilRef.current,
        })
      ) {
        return;
      }

      const nextEnabled = resolveAutoScrollEnabled(container);
      isAutoScrollEnabledRef.current = nextEnabled;
      setIsAutoScrollEnabled(nextEnabled);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isChatScrollIntentKey(event.key)) {
        markUserIntent();
      }
    };

    container.addEventListener("wheel", onWheel, { passive: true });
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("pointerdown", onPointerDown, { passive: true });
    container.addEventListener("scroll", onScroll, { passive: true });
    container.addEventListener("keydown", onKeyDown);

    detachListenerRef.current = () => {
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("scroll", onScroll);
      container.removeEventListener("keydown", onKeyDown);
    };

    return detachListenerRef.current;
  }, [hasRecentUserIntent, markUserIntent]);

  useEffect(() => {
    return () => {
      clearSettleObserver();
      if (detachListenerRef.current) {
        detachListenerRef.current();
        detachListenerRef.current = null;
      }
      observedContainerRef.current = null;
    };
  }, [clearSettleObserver]);

  return {
    bottomSpacerHeight: 0,
    containerRef,
    contentRef,
    followIfNeeded,
    isAutoScrollEnabled,
    reenableAutoScroll,
    scrollToBottom,
    scrollToMessageTop,
  };
}
