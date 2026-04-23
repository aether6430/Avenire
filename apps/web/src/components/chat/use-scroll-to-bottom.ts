import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

const PROGRAMMATIC_SCROLL_GRACE_MS = 200;
const AUTO_SCROLL_RESUME_THRESHOLD_PX = 64;

function getBottomScrollTop(container: HTMLElement) {
  return Math.max(0, container.scrollHeight - container.clientHeight);
}

function getDistanceFromBottom(container: HTMLElement) {
  return getBottomScrollTop(container) - container.scrollTop;
}

function isNearBottom(container: HTMLElement) {
  return getDistanceFromBottom(container) <= AUTO_SCROLL_RESUME_THRESHOLD_PX;
}

export function useScrollToBottom<T extends HTMLElement>(options: {
  isStreaming: boolean;
}): {
  containerRef: RefObject<T | null>;
  isAutoScrollEnabled: boolean;
  followIfNeeded: (behavior?: ScrollBehavior) => void;
  reenableAutoScroll: (behavior?: ScrollBehavior) => void;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
} {
  const { isStreaming: _isStreaming } = options;
  const containerRef = useRef<T>(null);
  const observedContainerRef = useRef<T | null>(null);
  const detachListenerRef = useRef<(() => void) | null>(null);
  const programmaticScrollUntilRef = useRef(0);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const isAutoScrollEnabledRef = useRef(isAutoScrollEnabled);

  useEffect(() => {
    isAutoScrollEnabledRef.current = isAutoScrollEnabled;
  }, [isAutoScrollEnabled]);

  const markProgrammaticScroll = useCallback(() => {
    programmaticScrollUntilRef.current =
      Date.now() + PROGRAMMATIC_SCROLL_GRACE_MS;
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
      observedContainerRef.current = null;
    };
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      markProgrammaticScroll();
      container.scrollTo({
        top: getBottomScrollTop(container),
        behavior,
      });
    },
    [markProgrammaticScroll]
  );

  const reenableAutoScroll = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      enableAutoScroll();
      scrollToBottom(behavior);
    },
    [enableAutoScroll, scrollToBottom]
  );

  const followIfNeeded = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      if (!isAutoScrollEnabledRef.current) {
        return;
      }

      const container = containerRef.current;
      if (!container) {
        return;
      }

      requestAnimationFrame(() => {
        if (!isAutoScrollEnabledRef.current || !containerRef.current) {
          return;
        }
        scrollToBottom(behavior);
      });
    },
    [scrollToBottom]
  );

  return {
    containerRef,
    isAutoScrollEnabled,
    followIfNeeded,
    reenableAutoScroll,
    scrollToBottom,
  };
}
