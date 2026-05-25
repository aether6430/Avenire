"use client";

import { useEffect, useState } from "react";
import { KEYBOARD_DETECTED_STORAGE_KEY } from "@/components/settings/settings-panel-model";

export function useSettingsPanelKeyboard() {
  const [hasKeyboardDetected, setHasKeyboardDetected] = useState(false);

  useEffect(() => {
    const storedKeyboardDetected =
      window.localStorage.getItem(KEYBOARD_DETECTED_STORAGE_KEY) === "true";
    const hasKeyboardApi = "keyboard" in navigator;

    if (storedKeyboardDetected || hasKeyboardApi) {
      setHasKeyboardDetected(true);
      return;
    }

    const detectKeyboard = (event: KeyboardEvent) => {
      if (event.isComposing || event.key === "Unidentified") {
        return;
      }
      setHasKeyboardDetected(true);
      window.localStorage.setItem(KEYBOARD_DETECTED_STORAGE_KEY, "true");
      window.removeEventListener("keydown", detectKeyboard);
    };

    window.addEventListener("keydown", detectKeyboard, { passive: true });
    return () => window.removeEventListener("keydown", detectKeyboard);
  }, []);

  return { hasKeyboardDetected };
}
