import { useCallback, useEffect, useRef, type RefObject } from "react";

const BOTTOM_THRESHOLD_PX = 40;

function isNearBottom(element: HTMLElement) {
  const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
  return remaining <= BOTTOM_THRESHOLD_PX;
}

export function useScrollToBottom<T extends HTMLElement>(): [
  RefObject<T | null>,
  RefObject<T | null>,
  (options?: { behavior?: ScrollBehavior; force?: boolean }) => void,
] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);
  const shouldAutoScrollRef = useRef(true);
  const observedContainerRef = useRef<T | null>(null);
  const detachListenerRef = useRef<(() => void) | null>(null);

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

    const onScroll = () => {
      shouldAutoScrollRef.current = isNearBottom(container);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    detachListenerRef.current = () => {
      container.removeEventListener("scroll", onScroll);
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

  const scroll = useCallback((options?: { behavior?: ScrollBehavior; force?: boolean }) => {
    const behavior = options?.behavior ?? "smooth";
    const force = options?.force ?? false;
    if (!(force || shouldAutoScrollRef.current)) {
      return;
    }

    const container = containerRef.current;
    const end = endRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
      return;
    }
    if (end) {
      end.scrollIntoView({ behavior, block: "nearest" });
    }
  }, []);

  return [containerRef, endRef, scroll];
}
