"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

    setPeekHovered(true);
  }, [state]);

  const closePeekSidebar = useCallback(() => {
    if (state !== "collapsed") {
      return;
    }

    if (peekCloseTimerRef.current) {
      clearTimeout(peekCloseTimerRef.current);
    }

    peekCloseTimerRef.current = setTimeout(() => {
      setPeekHovered(false);
      peekCloseTimerRef.current = null;
    }, 90);
  }, [state]);

  return {
    closePeekSidebar,
    isPeekabooActive,
    openPeekSidebar,
  };
}
