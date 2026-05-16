"use client";

import type { FlashcardSetSummary } from "@/lib/flashcards";

export async function loadFlashcardsSidebarSets(signal?: AbortSignal) {
  const response = await fetch("/api/flashcards/sets", {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    sets?: FlashcardSetSummary[];
  };
  return payload.sets ?? [];
}

export async function createFlashcardsSidebarSet({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  const response = await fetch("/api/flashcards/sets", {
    body: JSON.stringify({ description, title }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    return {
      setId: null,
      status: "Unable to create the mindset set right now.",
    };
  }

  const payload = (await response.json()) as {
    set?: { id?: string };
  };
  const setId = payload.set?.id ?? null;

  return {
    setId,
    status: setId
      ? null
      : "The mindset set was created, but it could not be opened automatically.",
  };
}
