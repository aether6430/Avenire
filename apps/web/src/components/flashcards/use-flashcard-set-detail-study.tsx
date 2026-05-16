"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type IFlashcard, useFlashcardArray } from "react-quizlet-flashcard";
import {
  loadFlashcardReviewSession,
  submitFlashcardCardReview,
} from "@/components/flashcards/flashcard-set-detail-client";
import type {
  Rating,
  StudyStatus,
} from "@/components/flashcards/flashcard-set-detail-model";
import { StudyCardFace } from "@/components/flashcards/flashcard-set-detail-study-dialog";
import type {
  FlashcardReviewQueueItem,
  FlashcardTaxonomy,
} from "@/lib/flashcards";
import { emitPetNotification } from "@/lib/pet-preferences";

export function useFlashcardSetDetailStudy({
  drillFilters,
  initialQueue,
  initialStudyOpen = false,
  onRefreshSet,
  setId,
}: {
  drillFilters: FlashcardTaxonomy[];
  initialQueue?: FlashcardReviewQueueItem[];
  initialStudyOpen?: boolean;
  onRefreshSet: () => Promise<void>;
  setId: string;
}) {
  const [studyQueue, setStudyQueue] = useState(initialQueue ?? []);
  const [studyOpen, setStudyOpen] = useState(initialStudyOpen);
  const [studyRevealed, setStudyRevealed] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [studyStatus, setStudyStatus] = useState<StudyStatus>(
    (initialQueue ?? []).length > 0 ? "ready" : "idle"
  );
  const [studyError, setStudyError] = useState<string | null>(null);
  const [studyIndex, setStudyIndex] = useState(0);
  const [studySessionTotal, setStudySessionTotal] = useState(
    (initialQueue ?? []).length
  );
  const [studySessionReviewed, setStudySessionReviewed] = useState(0);

  useEffect(() => {
    if (studyOpen) {
      return;
    }

    const nextQueue = initialQueue ?? [];
    setStudyQueue(nextQueue);
    setStudyStatus(nextQueue.length > 0 ? "ready" : "idle");
    setStudySessionTotal(nextQueue.length);
    setStudySessionReviewed(0);
    setStudyIndex(0);
  }, [initialQueue, studyOpen]);

  const activeCard = studyQueue[studyIndex] ?? null;
  const reviewCards = useMemo<Array<IFlashcard & { id: string }>>(
    () =>
      studyQueue.map((item) => ({
        id: item.card.id,
        back: {
          html: (
            <div data-side="back" key={`study-back-face-${item.card.id}`}>
              <StudyCardFace
                align="left"
                content={item.card.backMarkdown}
                id={`study-back-${item.card.id}`}
                notes={item.card.notesMarkdown}
              />
            </div>
          ),
        },
        front: {
          html: (
            <div data-side="front" key={`study-front-face-${item.card.id}`}>
              <StudyCardFace
                align="center"
                content={item.card.frontMarkdown}
                id={`study-front-${item.card.id}`}
              />
            </div>
          ),
        },
      })),
    [studyQueue]
  );

  const reviewArrayHook = useFlashcardArray({
    deckLength: reviewCards.length,
    flipDirection: "rtl",
    onCardChange: (cardIndex) => setStudyIndex(cardIndex),
    onFlip: (_cardIndex, state) => setStudyRevealed(state === "back"),
    showControls: false,
    showCount: false,
    showProgressBar: false,
  });
  const flipReviewCard = reviewArrayHook.flipHook.flip;
  const resetReviewCardState = reviewArrayHook.flipHook.resetCardState;
  const setReviewCardIndex = reviewArrayHook.setCurrentCard;

  const studyProgress = useMemo(() => {
    const total = studySessionTotal;
    const current = total > 0 ? Math.min(studyIndex + 1, total) : 0;

    return {
      current,
      percentage:
        total > 0 ? Math.round((studySessionReviewed / total) * 100) : 0,
      total,
    };
  }, [studyIndex, studySessionReviewed, studySessionTotal]);

  const loadStudySession = useCallback(async () => {
    setStudyStatus("loading");
    setStudyError(null);
    try {
      const nextQueue = await loadFlashcardReviewSession({
        drillFilters,
        setId,
      });
      setStudyQueue(nextQueue);
      setStudySessionTotal(nextQueue.length);
      setStudySessionReviewed(0);
      setStudyIndex(0);
      setStudyRevealed(false);
      resetReviewCardState();
      setReviewCardIndex(0);
      setStudyStatus("ready");
    } catch {
      setStudyQueue([]);
      setStudySessionTotal(0);
      setStudySessionReviewed(0);
      setStudyIndex(0);
      resetReviewCardState();
      setReviewCardIndex(0);
      setStudyError("Unable to load this review session right now.");
      setStudyStatus("error");
    }
  }, [drillFilters, resetReviewCardState, setId, setReviewCardIndex]);

  useEffect(() => {
    if (!studyOpen) {
      return;
    }

    loadStudySession().catch(() => undefined);
  }, [loadStudySession, studyOpen]);

  const submitReview = useCallback(
    async (rating: Rating) => {
      if (!(activeCard && !reviewBusy)) {
        return;
      }

      setReviewBusy(true);
      setStudyError(null);
      try {
        await submitFlashcardCardReview({
          cardId: activeCard.card.id,
          rating,
        });

        if (rating === "again") {
          emitPetNotification({
            animation: "failed",
            message: "Review it once more",
            tone: "failure",
          });
        } else if (rating === "hard") {
          emitPetNotification({
            animation: "review",
            message: "Keep going",
            tone: "info",
          });
        } else {
          emitPetNotification({
            animation: "waving",
            message: rating === "easy" ? "You nailed it" : "Good recall",
            tone: "success",
          });
        }

        setStudySessionReviewed((value) => value + 1);
        setStudyRevealed(false);
        resetReviewCardState();
        if (studyIndex < studyQueue.length - 1) {
          reviewArrayHook.nextCard();
        } else {
          setStudyIndex(studyQueue.length);
        }

        if (studyIndex >= studyQueue.length - 1) {
          await onRefreshSet();
        }
      } catch {
        setStudyError("We couldn't record that rating. Try again.");
      } finally {
        setReviewBusy(false);
      }
    },
    [
      activeCard,
      onRefreshSet,
      resetReviewCardState,
      reviewArrayHook,
      reviewBusy,
      studyQueue.length,
      studyIndex,
    ]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !studyOpen ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        flipReviewCard(studyRevealed ? "front" : "back");
      }

      const ratingMap: Record<string, Rating> = {
        Digit1: "again",
        Digit2: "hard",
        Digit3: "good",
        Digit4: "easy",
      };

      const rating = ratingMap[event.code];
      if (rating && studyRevealed && activeCard) {
        event.preventDefault();
        submitReview(rating).catch(() => undefined);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeCard, flipReviewCard, studyOpen, studyRevealed, submitReview]);

  const handleStudyOpenChange = useCallback(
    (open: boolean) => {
      setStudyOpen(open);
      if (!open) {
        resetReviewCardState();
        setReviewCardIndex(0);
        setStudyRevealed(false);
        setStudyIndex(0);
        setStudyStatus(studyQueue.length > 0 ? "ready" : "idle");
        if (studySessionReviewed > 0) {
          onRefreshSet().catch(() => undefined);
        }
      }
    },
    [
      onRefreshSet,
      resetReviewCardState,
      setReviewCardIndex,
      studyQueue.length,
      studySessionReviewed,
    ]
  );

  const startReview = useCallback(() => {
    setStudyQueue([]);
    setStudyStatus("loading");
    setStudyError(null);
    setStudySessionReviewed(0);
    setStudySessionTotal(0);
    setStudyIndex(0);
    setStudyOpen(true);
  }, []);

  return {
    activeCard,
    flipReviewCard,
    handleStudyOpenChange,
    loadStudySession,
    resetReviewCardState,
    reviewArrayHook,
    reviewBusy,
    reviewCards,
    startReview,
    studyError,
    studyIndex,
    studyOpen,
    studyProgress,
    studyRevealed,
    studySessionReviewed,
    studySessionTotal,
    studyStatus,
    submitReview,
  };
}

export type FlashcardSetDetailStudyRuntime = ReturnType<
  typeof useFlashcardSetDetailStudy
>;
