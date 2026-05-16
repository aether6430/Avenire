"use client";

import type {
  FlashcardReviewQueueItem,
  FlashcardSetRecord,
  FlashcardTaxonomy,
} from "@/lib/flashcards";
import { FlashcardSetDetailSurface } from "./flashcard-set-detail-surface";
import { useFlashcardSetDetail } from "./use-flashcard-set-detail";

type Rating = "again" | "hard" | "good" | "easy";
export function FlashcardSetDetail({
  initialDrillFilters,
  initialQueue,
  initialSet,
  initialStudyOpen = false,
}: {
  initialDrillFilters: FlashcardTaxonomy[];
  initialQueue?: FlashcardReviewQueueItem[];
  initialSet: FlashcardSetRecord;
  initialStudyOpen?: boolean;
}) {
  const runtime = useFlashcardSetDetail({
    initialDrillFilters,
    initialQueue,
    initialSet,
    initialStudyOpen,
  });

  return <FlashcardSetDetailSurface runtime={runtime} />;
}
