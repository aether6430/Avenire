"use client";

import { useEffect, useRef, useState } from "react";
import { useFilesPinsStore } from "@/stores/filesPinsStore";

export function useDashboardSidebarStartup() {
  const [deferredStartupReady, setDeferredStartupReady] = useState(false);
  const pinsRehydratedRef = useRef(false);

  useEffect(() => {
    if (deferredStartupReady || typeof window === "undefined") {
      return;
    }

    const markReady = () => {
      setDeferredStartupReady(true);
    };

    const cleanupListeners = () => {
      window.removeEventListener("pointerdown", markReady);
      window.removeEventListener("keydown", markReady);
      window.removeEventListener("focusin", markReady);
    };

    window.addEventListener("pointerdown", markReady, {
      once: true,
      passive: true,
    });
    window.addEventListener("keydown", markReady, { once: true });
    window.addEventListener("focusin", markReady, { once: true });

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => {
        markReady();
      });
      return () => {
        cleanupListeners();
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = globalThis.setTimeout(markReady, 2000);
    return () => {
      cleanupListeners();
      globalThis.clearTimeout(timeoutId);
    };
  }, [deferredStartupReady]);

  useEffect(() => {
    if (!deferredStartupReady) {
      return;
    }
    if (!pinsRehydratedRef.current) {
      pinsRehydratedRef.current = true;
      useFilesPinsStore.persist.rehydrate();
    }
  }, [deferredStartupReady]);

  return { deferredStartupReady };
}
