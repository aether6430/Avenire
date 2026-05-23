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

export function useDashboardSidebarPeek({
  isMobile,
  state,
}: {
  isMobile: boolean;
  state: string;
}) {
  const [peekHovered, setPeekHovered] = useState(false);
  const peekCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (state !== "collapsed") {
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
      peekCloseTimerRef.current = null;
    }, closeDelayMs);
  }, [state]);

  return {
    closePeekSidebar,
    isPeekabooActive,
    openPeekSidebar,
  };
}
