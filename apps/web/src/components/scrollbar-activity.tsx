"use client";

import { useEffect } from "react";

const SCROLLBAR_FADE_DELAY_MS = 800;

export function ScrollbarActivity() {
  useEffect(() => {
    const root = document.documentElement;
    let fadeTimer: ReturnType<typeof setTimeout> | null = null;

    const showScrollbars = () => {
      root.dataset.scrollbarsActive = "true";

      if (fadeTimer) {
        clearTimeout(fadeTimer);
      }

      fadeTimer = setTimeout(() => {
        delete root.dataset.scrollbarsActive;
        fadeTimer = null;
      }, SCROLLBAR_FADE_DELAY_MS);
    };

    document.addEventListener("scroll", showScrollbars, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("scroll", showScrollbars, {
        capture: true,
      });
      if (fadeTimer) {
        clearTimeout(fadeTimer);
      }
      delete root.dataset.scrollbarsActive;
    };
  }, []);

  return null;
}
