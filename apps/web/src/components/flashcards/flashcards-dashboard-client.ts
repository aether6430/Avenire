"use client";

import type { FlashcardGenerationRequest } from "@/components/flashcards/flashcards-dashboard-model";

export async function generateFlashcardsOnboardingSet(
  generationRequest: FlashcardGenerationRequest
) {
  const response = await fetch("/api/flashcards/onboarding", {
    body: JSON.stringify(generationRequest),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(payload.error ?? "Unable to generate mindset.");
  }

  const payload = (await response.json()) as {
    set?: { id?: string };
  };
  const setId = payload.set?.id;
  if (!setId) {
    throw new Error(
      "Mindset generation finished, but it could not be opened automatically."
    );
  }

  return setId;
}

export async function createFlashcardSet(input: {
  description: string;
  tags: string[];
  title: string;
}) {
  const response = await fetch("/api/flashcards/sets", {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    return {
      setId: null,
      status: "Could not create the mindset set.",
    };
  }

  const payload = (await response.json()) as {
    set?: { id?: string };
  };
  const setId = payload.set?.id;
  if (!setId) {
    return {
      setId: null,
      status:
        "The mindset set was created, but it could not be opened automatically.",
    };
  }

  return {
    setId,
    status: null,
  };
}
