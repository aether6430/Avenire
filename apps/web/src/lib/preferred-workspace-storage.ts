"use client";

import { useSyncExternalStore } from "react";

export const PREFERRED_WORKSPACE_ID_STORAGE_KEY = "preferredWorkspaceId";

function deserializePreferredWorkspaceIdValue(value: string | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    return null;
  }

  if (
    trimmed.startsWith('"') ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[")
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === "string" && parsed.trim() ? parsed.trim() : null;
    } catch {
      return null;
    }
  }

  return trimmed;
}

function dispatchPreferredWorkspaceIdChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new StorageEvent("local-storage", {
      key: PREFERRED_WORKSPACE_ID_STORAGE_KEY,
    })
  );
}

export function readPreferredWorkspaceId() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return deserializePreferredWorkspaceIdValue(
      window.localStorage.getItem(PREFERRED_WORKSPACE_ID_STORAGE_KEY)
    );
  } catch {
    return null;
  }
}

export function writePreferredWorkspaceId(value: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedValue = typeof value === "string" ? value.trim() : "";

  try {
    if (!normalizedValue) {
      window.localStorage.removeItem(PREFERRED_WORKSPACE_ID_STORAGE_KEY);
      dispatchPreferredWorkspaceIdChange();
      return;
    }

    window.localStorage.setItem(
      PREFERRED_WORKSPACE_ID_STORAGE_KEY,
      JSON.stringify(normalizedValue)
    );
    dispatchPreferredWorkspaceIdChange();
  } catch {
    // Ignore storage access failures. The route and workspace context remain authoritative.
  }
}

function subscribeToPreferredWorkspaceId(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = (event: Event) => {
    const storageEvent = event as StorageEvent;
    if (
      storageEvent.key &&
      storageEvent.key !== PREFERRED_WORKSPACE_ID_STORAGE_KEY
    ) {
      return;
    }

    callback();
  };

  window.addEventListener("storage", handleChange);
  window.addEventListener("local-storage", handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener("local-storage", handleChange);
  };
}

export function usePreferredWorkspaceId() {
  return useSyncExternalStore(
    subscribeToPreferredWorkspaceId,
    readPreferredWorkspaceId,
    () => null
  );
}
