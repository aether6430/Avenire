"use client";

import { useEffect, useState } from "react";

function detectTouchDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  const hasTouchPoints = navigator.maxTouchPoints > 0;
  const hasCoarsePointer =
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(any-pointer: coarse)").matches;

  return hasTouchPoints || hasCoarsePointer;
}

export function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      setIsTouchDevice(detectTouchDevice());
    };

    update();

    const pointerQuery = window.matchMedia("(pointer: coarse)");
    const anyPointerQuery = window.matchMedia("(any-pointer: coarse)");

    pointerQuery.addEventListener("change", update);
    anyPointerQuery.addEventListener("change", update);
    window.addEventListener("resize", update);

    return () => {
      pointerQuery.removeEventListener("change", update);
      anyPointerQuery.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return isTouchDevice;
}
