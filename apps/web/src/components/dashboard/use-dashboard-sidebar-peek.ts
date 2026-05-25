"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const DASHBOARD_SIDEBAR_PEEK_CLOSE_DELAY_MS = 90;

export function resolveDashboardSidebarPeekHovered(input: {
  action: "close" | "open";
  current: boolean;
  state: string;
}) {
  if (input.state !== "collapsed") {
    return input.current;
  }

  return input.action === "open" ? true : input.current;
}

export function resolveDashboardSidebarPeekCloseDelayMs(state: string) {
  return state === "collapsed" ? DASHBOARD_SIDEBAR_PEEK_CLOSE_DELAY_MS : 0;
}

export function canOpenDashboardSidebarPeek(input: {
  state: string;
  suppressed: boolean;
}) {
  return input.state === "collapsed" && !input.suppressed;
}

export function useDashboardSidebarPeek({
  isMobile,
  state,
}: {
  isMobile: boolean;
  state: string;
}) {
  const [peekHovered, setPeekHovered] = useState(false);
  const peekCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekSuppressedRef = useRef(false);
  const isPeekabooActive = !isMobile && state === "collapsed" && peekHovered;

  useEffect(() => {
    if (!isMobile && state !== "collapsed") {
      setPeekHovered(false);
    }
  }, [isMobile, state]);

  useEffect(() => {
    return () => {
      if (peekCloseTimerRef.current) {
        clearTimeout(peekCloseTimerRef.current);
        peekCloseTimerRef.current = null;
      }
    };
  }, []);

  const openPeekSidebar = useCallback(() => {
    if (
      !canOpenDashboardSidebarPeek({
        state,
        suppressed: peekSuppressedRef.current,
      })
    ) {
      return;
    }

    if (peekCloseTimerRef.current) {
      clearTimeout(peekCloseTimerRef.current);
      peekCloseTimerRef.current = null;
    }

    setPeekHovered((current) =>
      resolveDashboardSidebarPeekHovered({
        action: "open",
        current,
        state,
      })
    );
  }, [state]);

  const closePeekSidebar = useCallback(() => {
    if (state !== "collapsed") {
      return;
    }

    if (peekCloseTimerRef.current) {
      clearTimeout(peekCloseTimerRef.current);
      peekCloseTimerRef.current = null;
    }

    const closeDelayMs = resolveDashboardSidebarPeekCloseDelayMs(state);
    peekCloseTimerRef.current = setTimeout(() => {
      setPeekHovered(false);
      peekSuppressedRef.current = false;
      peekCloseTimerRef.current = null;
    }, closeDelayMs);
  }, [state]);

  const suppressPeekUntilLeave = useCallback(() => {
    peekSuppressedRef.current = true;
    setPeekHovered(false);
  }, []);

  return {
    closePeekSidebar,
    isPeekabooActive,
    openPeekSidebar,
    suppressPeekUntilLeave,
  };
}
