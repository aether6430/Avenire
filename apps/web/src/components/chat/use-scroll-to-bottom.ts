import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

const FOLLOW_EASING = 0.18;
const MANUAL_SCROLL_GRACE_MS = 900;
const USER_MESSAGE_TOP_OFFSET_PX = 72;
const AUTO_SCROLL_RESUME_THRESHOLD_PX = 64;

function getLatestUserMessage(container: HTMLElement) {
  const userMessages = container.querySelectorAll<HTMLElement>(
    '[data-role="user"][data-message-id]'
  );
  return userMessages.item(userMessages.length - 1) ?? null;
}

function getBottomScrollTop(container: HTMLElement) {
  return Math.max(0, container.scrollHeight - container.clientHeight);
}

function isNearBottom(container: HTMLElement) {
  return (
    getBottomScrollTop(container) - container.scrollTop <=
    AUTO_SCROLL_RESUME_THRESHOLD_PX
  );
}

export function useScrollToBottom<T extends HTMLElement>(options: {
  isStreaming: boolean;
}): {
  containerRef: RefObject<T | null>;
  endRef: RefObject<T | null>;
  isAutoScrollEnabled: boolean;
  reenableAutoScroll: (behavior?: ScrollBehavior) => void;
  resetForNewMessage: () => void;
  scrollLatestUserMessageIntoPosition: (behavior?: ScrollBehavior) => void;
} {
  const { isStreaming } = options;
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);
  const observedContainerRef = useRef<T | null>(null);
  const detachListenerRef = useRef<(() => void) | null>(null);
  const followFrameRef = useRef<number | null>(null);
  const programmaticScrollUntilRef = useRef(0);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const isAutoScrollEnabledRef = useRef(isAutoScrollEnabled);

  useEffect(() => {
    isAutoScrollEnabledRef.current = isAutoScrollEnabled;
  }, [isAutoScrollEnabled]);

  const markProgrammaticScroll = useCallback(() => {
    programmaticScrollUntilRef.current = Date.now() + MANUAL_SCROLL_GRACE_MS;
  }, []);

  const disableAutoScroll = useCallback(() => {
    if (!isAutoScrollEnabledRef.current) {
      return;
    }

    isAutoScrollEnabledRef.current = false;
    setIsAutoScrollEnabled(false);
  }, []);

  const enableAutoScroll = useCallback(() => {
    if (isAutoScrollEnabledRef.current) {
      return;
    }

    isAutoScrollEnabledRef.current = true;
    setIsAutoScrollEnabled(true);
  }, []);

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
        enableAutoScroll();
        return;
      }

      disableAutoScroll();
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
      if (followFrameRef.current !== null) {
        cancelAnimationFrame(followFrameRef.current);
        followFrameRef.current = null;
      }
      observedContainerRef.current = null;
    };
  }, []);

  const scrollLatestUserMessageIntoPosition = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

    const latestUserMessage = getLatestUserMessage(container);
    if (!latestUserMessage) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const messageRect = latestUserMessage.getBoundingClientRect();
    const targetOffset = Math.min(
      USER_MESSAGE_TOP_OFFSET_PX,
      Math.max(48, Math.min(container.clientHeight, window.innerHeight) * 0.1)
    );
    const nextTop =
      container.scrollTop +
      (messageRect.top - containerRect.top) -
        targetOffset;

      markProgrammaticScroll();
      container.scrollTo({
        top: Math.max(0, nextTop),
        behavior,
      });
    },
    [markProgrammaticScroll]
  );

  const reenableAutoScroll = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const container = containerRef.current;
      const end = endRef.current;

      enableAutoScroll();
      markProgrammaticScroll();

      if (container) {
        container.scrollTo({
          top: getBottomScrollTop(container),
          behavior,
        });
        return;
      }

      end?.scrollIntoView({ behavior, block: "nearest" });
    },
    [enableAutoScroll, markProgrammaticScroll]
  );

  const resetForNewMessage = useCallback(() => {
    enableAutoScroll();
  }, [enableAutoScroll]);

  useEffect(() => {
    if (!isStreaming || !isAutoScrollEnabled) {
      if (followFrameRef.current !== null) {
        cancelAnimationFrame(followFrameRef.current);
        followFrameRef.current = null;
      }
      return;
    }

    const tick = () => {
      const container = containerRef.current;
      if (!container || !isAutoScrollEnabledRef.current) {
        followFrameRef.current = null;
        return;
      }

      const targetBottom = getBottomScrollTop(container);
      const nextTop =
        container.scrollTop + (targetBottom - container.scrollTop) * FOLLOW_EASING;

      if (Math.abs(targetBottom - container.scrollTop) > 0.5) {
        markProgrammaticScroll();
        container.scrollTop = nextTop;
      }

      followFrameRef.current = requestAnimationFrame(tick);
    };

    followFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (followFrameRef.current !== null) {
        cancelAnimationFrame(followFrameRef.current);
        followFrameRef.current = null;
      }
    };
  }, [isAutoScrollEnabled, isStreaming, markProgrammaticScroll]);

  return {
    containerRef,
    endRef,
    isAutoScrollEnabled,
    reenableAutoScroll,
    resetForNewMessage,
    scrollLatestUserMessageIntoPosition,
  };
}
