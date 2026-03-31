"use client";

import { readBrowserCache, writeBrowserCache } from "@/lib/browser-cache";
import type { FlashcardSetRecord } from "@/lib/flashcards";

interface CachedFlashcardSetPayload {
  cachedAt: number;
  set: FlashcardSetRecord;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFlashcardSetRecord(value: unknown): value is FlashcardSetRecord {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    isString(record.id) &&
    isString(record.title) &&
    isString(record.workspaceId) &&
    isString(record.createdAt) &&
    isString(record.updatedAt) &&
    Array.isArray(record.tags) &&
    Array.isArray(record.cards) &&
    Array.isArray(record.cardSnapshots) &&
    typeof record.cardCount === "number" &&
    typeof record.dueCount === "number" &&
    typeof record.newCount === "number" &&
    typeof record.reviewCount7d === "number" &&
    typeof record.reviewCountToday === "number" &&
    typeof record.sourceType === "string" &&
    typeof record.stateCounts === "object" &&
    record.stateCounts !== null &&
    typeof record.enrollment === "object"
  );
}

function cacheKey(setId: string) {
  return `avenire:flashcards:set:${setId}`;
}

export function readCachedFlashcardSet(setId: string) {
  const payload = readBrowserCache(
    cacheKey(setId),
    (value): value is CachedFlashcardSetPayload =>
      Boolean(
        value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          typeof (value as { cachedAt?: unknown }).cachedAt === "number" &&
          isFlashcardSetRecord((value as { set?: unknown }).set)
      )
  );

  return payload?.set ?? null;
}

export function writeCachedFlashcardSet(set: FlashcardSetRecord) {
  writeBrowserCache(cacheKey(set.id), {
    cachedAt: Date.now(),
    set,
  } satisfies CachedFlashcardSetPayload);
}

export function removeCachedFlashcardSet(setId: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(cacheKey(setId));
  } catch {
    // Ignore browser storage failures.
  }
}

const inFlightFlashcardPrefetches = new Map<string, Promise<void>>();

export function prefetchFlashcardSet(setId: string) {
  const existing = inFlightFlashcardPrefetches.get(setId);
  if (existing) {
    return existing;
  }

  const next = (async () => {
    const cached = readCachedFlashcardSet(setId);
    if (cached) {
      return;
    }

    const response = await fetch(`/api/flashcards/sets/${setId}`, {
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { set?: FlashcardSetRecord };
    if (payload.set) {
      writeCachedFlashcardSet(payload.set);
    }
  })().finally(() => {
    if (inFlightFlashcardPrefetches.get(setId) === next) {
      inFlightFlashcardPrefetches.delete(setId);
    }
  });

  inFlightFlashcardPrefetches.set(setId, next);
  return next;
}
