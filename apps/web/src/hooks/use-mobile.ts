"use client";

import { useLayoutEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useLayoutEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const updateIsMobile = () => {
      setIsMobile(mql.matches);
    };

    mql.addEventListener("change", updateIsMobile);
    updateIsMobile();

    return () => mql.removeEventListener("change", updateIsMobile);
  }, []);

  return isMobile;
}
