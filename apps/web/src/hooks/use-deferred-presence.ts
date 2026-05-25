"use client";

import { useEffect, useState } from "react";

export function useDeferredPresence(active: boolean, exitDurationMs = 360) {
  const [present, setPresent] = useState(active);

  useEffect(() => {
    if (active) {
      setPresent(true);
      return undefined;
    }

    if (!present) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setPresent(false);
    }, exitDurationMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [active, exitDurationMs, present]);

  return active || present;
}
