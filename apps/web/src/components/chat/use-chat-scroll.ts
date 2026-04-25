"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

const PROGRAMMATIC_SCROLL_GRACE_MS = 200;
const AUTO_SCROLL_RESUME_THRESHOLD_PX = 64;
const TOP_ANCHOR_OFFSET_PX = 28;

function getBottomScrollTop(container: HTMLElement) {
  return Math.max(0, container.scrollHeight - container.clientHeight);
}

function getDistanceFromBottom(container: HTMLElement) {
  return getBottomScrollTop(container) - container.scrollTop;
}

function isNearBottom(container: HTMLElement) {
  return getDistanceFromBottom(container) <= AUTO_SCROLL_RESUME_THRESHOLD_PX;
}

function escapeSelectorValue(value: string) {
  return value.replace(/"/g, '\\"');
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
  const programmaticScrollUntilRef = useRef(0);
  const observedContainerRef = useRef<HTMLDivElement | null>(null);
  const detachListenerRef = useRef<(() => void) | null>(null);
  const lastUserMessageIdRef = useRef<string | null>(latestUserMessageId ?? null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const isAutoScrollEnabledRef = useRef(isAutoScrollEnabled);

  useEffect(() => {
    isAutoScrollEnabledRef.current = isAutoScrollEnabled;
  }, [isAutoScrollEnabled]);

  const markProgrammaticScroll = useCallback(() => {
    programmaticScrollUntilRef.current =
      Date.now() + PROGRAMMATIC_SCROLL_GRACE_MS;
  }, []);

  const getMessageElement = useCallback((messageId: string) => {
    const container = containerRef.current;
    if (!container) {
      return null;
    }

    return container.querySelector<HTMLElement>(
      `[data-message-id="${escapeSelectorValue(messageId)}"]`
    );
  }, []);

  const scrollToMessageTop = useCallback(
    (messageId: string, behavior: ScrollBehavior = "smooth") => {
      const container = containerRef.current;
      const message = getMessageElement(messageId);
      if (!container || !message) {
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

  const followIfNeeded = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const container = containerRef.current;
      if (!container || !isAutoScrollEnabledRef.current) {
        return;
      }

      if (isStreaming || isNearBottom(container)) {
        scrollToBottom(behavior);
      }
    },
    [isStreaming, scrollToBottom]
  );

  const reenableAutoScroll = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      isAutoScrollEnabledRef.current = true;
      setIsAutoScrollEnabled(true);
      followIfNeeded(behavior);
    },
    [followIfNeeded]
  );

  useLayoutEffect(() => {
    if (!latestUserMessageId || latestUserMessageId === lastUserMessageIdRef.current) {
      return;
    }

    lastUserMessageIdRef.current = latestUserMessageId;
    isAutoScrollEnabledRef.current = true;
    setIsAutoScrollEnabled(true);

    const animationFrame = window.requestAnimationFrame(() => {
      scrollToMessageTop(latestUserMessageId, "smooth");
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [latestUserMessageId, messageCount, scrollToMessageTop]);

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

    const onManualIntent = () => {
      if (Date.now() < programmaticScrollUntilRef.current) {
        return;
      }

      if (isNearBottom(container)) {
        isAutoScrollEnabledRef.current = true;
        setIsAutoScrollEnabled(true);
        return;
      }

      isAutoScrollEnabledRef.current = false;
      setIsAutoScrollEnabled(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "PageDown" ||
        event.key === "PageUp" ||
        event.key === "Home" ||
        event.key === "End" ||
        event.key === " "
      ) {
        onManualIntent();
      }
    };

    container.addEventListener("wheel", onManualIntent, { passive: true });
    container.addEventListener("touchmove", onManualIntent, { passive: true });
    container.addEventListener("scroll", onManualIntent, { passive: true });
    container.addEventListener("keydown", onKeyDown);

    detachListenerRef.current = () => {
      container.removeEventListener("wheel", onManualIntent);
      container.removeEventListener("touchmove", onManualIntent);
      container.removeEventListener("scroll", onManualIntent);
      container.removeEventListener("keydown", onKeyDown);
    };
  });

  useEffect(() => {
    return () => {
      if (detachListenerRef.current) {
        detachListenerRef.current();
        detachListenerRef.current = null;
      }
      observedContainerRef.current = null;
    };
  }, []);

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
