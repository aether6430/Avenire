"use client";

import "react-quizlet-flashcard/dist/index.css";

import { useEffect, useRef } from "react";
import { FlashcardSetDetailStudyDialog } from "@/components/flashcards/flashcard-set-detail-study-dialog";
import { useFlashcardSetDetailStudy } from "@/components/flashcards/use-flashcard-set-detail-study";
import type {
  FlashcardReviewQueueItem,
  FlashcardTaxonomy,
} from "@/lib/flashcards";

export function FlashcardSetDetailStudyRuntime({
  drillFilters,
  initialQueue,
  onOpenChange,
  onRefreshSet,
  refreshToken,
  setId,
  setTitle,
}: {
  drillFilters: FlashcardTaxonomy[];
  initialQueue?: FlashcardReviewQueueItem[];
  onOpenChange: (open: boolean) => void;
  onRefreshSet: () => Promise<void>;
  refreshToken: number;
  setId: string;
  setTitle: string;
}) {
  const studyRuntime = useFlashcardSetDetailStudy({
    drillFilters,
    initialQueue,
    initialStudyOpen: true,
    onRefreshSet,
    setId,
  });
  const lastRefreshTokenRef = useRef(refreshToken);

  useEffect(() => {
    if (lastRefreshTokenRef.current === refreshToken) {
      return;
    }

    lastRefreshTokenRef.current = refreshToken;
    void studyRuntime.loadStudySession();
  }, [refreshToken, studyRuntime]);

  return (
    <FlashcardSetDetailStudyDialog
      activeCard={studyRuntime.activeCard}
      onFlipCard={studyRuntime.flipReviewCard}
      onOpenChange={(open) => {
        studyRuntime.handleStudyOpenChange(open);
        if (!open) {
          onOpenChange(false);
        }
      }}
      onSubmitReview={(rating) => {
        void studyRuntime.submitReview(rating);
      }}
      open
      reviewArrayHook={studyRuntime.reviewArrayHook}
      reviewBusy={studyRuntime.reviewBusy}
      reviewCards={studyRuntime.reviewCards}
      setTitle={setTitle}
      studyError={studyRuntime.studyError}
      studyIndex={studyRuntime.studyIndex}
      studyProgress={studyRuntime.studyProgress}
      studyRevealed={studyRuntime.studyRevealed}
      studySessionReviewed={studyRuntime.studySessionReviewed}
      studySessionTotal={studyRuntime.studySessionTotal}
      studyStatus={studyRuntime.studyStatus}
    />
  );
}
