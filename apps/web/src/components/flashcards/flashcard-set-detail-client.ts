"use client";

import type { Rating } from "@/components/flashcards/flashcard-set-detail-model";
import { buildFlashcardDrillQuery } from "@/components/flashcards/flashcard-set-detail-model";
import { normalizeFlashcardSetId } from "@/lib/flashcard-set-id";
import type {
  FlashcardReviewQueueItem,
  FlashcardSetRecord,
  FlashcardTaxonomy,
} from "@/lib/flashcards";

export async function loadFlashcardSetRecord(setId: string) {
  const normalizedSetId = normalizeFlashcardSetId(setId);
  if (!normalizedSetId) {
    return null;
  }

  const response = await fetch(`/api/flashcards/sets/${normalizedSetId}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { set?: FlashcardSetRecord };
  return payload.set ?? null;
}

export async function updateFlashcardSetMetadata({
  description,
  setId,
  title,
}: {
  description: string;
  setId: string;
  title: string;
}) {
  const response = await fetch(`/api/flashcards/sets/${setId}`, {
    body: JSON.stringify({
      description,
      title,
    }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });

  return response.ok;
}

export async function deleteFlashcardSetRecord(setId: string) {
  const response = await fetch(`/api/flashcards/sets/${setId}`, {
    method: "DELETE",
  });

  return response.ok;
}

export async function saveFlashcardSetCard({
  backMarkdown,
  cardId,
  concept,
  editingSource,
  frontMarkdown,
  notesMarkdown,
  setId,
  subject,
  tags,
  topic,
}: {
  backMarkdown: string;
  cardId?: string;
  concept: string;
  editingSource?: Record<string, unknown>;
  frontMarkdown: string;
  notesMarkdown: string;
  setId: string;
  subject: string;
  tags: string[];
  topic: string;
}) {
  const response = await fetch(
    cardId
      ? `/api/flashcards/cards/${cardId}`
      : `/api/flashcards/sets/${setId}/cards`,
    {
      body: JSON.stringify({
        backMarkdown,
        frontMarkdown,
        notesMarkdown,
        source: {
          ...(editingSource ?? {}),
          concept,
          subject,
          topic,
        },
        tags,
      }),
      headers: { "Content-Type": "application/json" },
      method: cardId ? "PATCH" : "POST",
    }
  );

  return response.ok;
}

export async function archiveFlashcardSetCard(cardId: string) {
  const response = await fetch(`/api/flashcards/cards/${cardId}`, {
    method: "DELETE",
  });

  return response.ok;
}

export async function toggleFlashcardSetEnrollment({
  newCardsPerDay,
  setId,
  status,
}: {
  newCardsPerDay: number;
  setId: string;
  status: "active" | "paused";
}) {
  const response = await fetch(`/api/flashcards/sets/${setId}/enrollment`, {
    body: JSON.stringify({
      newCardsPerDay,
      status,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  return response.ok;
}

export async function loadFlashcardReviewSession({
  drillFilters,
  setId,
}: {
  drillFilters: FlashcardTaxonomy[];
  setId: string;
}) {
  const query = new URLSearchParams({
    limit: "100",
    setId,
  });
  const drillQuery = buildFlashcardDrillQuery(drillFilters);
  if (drillQuery) {
    for (const [key, value] of new URLSearchParams(drillQuery).entries()) {
      query.append(key, value);
    }
  }

  const response = await fetch(
    `/api/flashcards/review/queue?${query.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(payload.error?.trim() || "Failed to load review queue");
  }

  const payload = (await response.json()) as {
    queue?: FlashcardReviewQueueItem[];
  };
  return payload.queue ?? [];
}

export async function submitFlashcardCardReview({
  cardId,
  rating,
}: {
  cardId: string;
  rating: Rating;
}) {
  const response = await fetch("/api/flashcards/review", {
    body: JSON.stringify({
      cardId,
      rating,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(payload.error?.trim() || "Failed to submit review");
  }
}
