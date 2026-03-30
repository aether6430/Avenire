"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FlashcardFlipState } from "@/hooks/use-flashcard";
import {
  type UseFlashcard,
  type UseFlashcardProps,
  useFlashcard,
} from "@/hooks/use-flashcard";

export interface UseFlashcardArray {
  canGoNext: boolean;
  canGoPrev: boolean;
  cardsInDisplay: number[];
  currentCard: number;
  cycle?: boolean;
  deckLength: number;
  flipHook: UseFlashcard;
  nextCard: () => void;
  prevCard: () => void;
  progressBar: {
    current: number;
    total: number;
    percentage: number;
  };
  setCurrentCard: (index: number) => void;
  showControls: boolean;
  showCount: boolean;
  showProgressBar: boolean;
}

export interface UseFlashcardArrayProps
  extends Omit<UseFlashcardProps, "onFlip"> {
  cycle?: boolean;
  deckLength: number;
  onCardChange?: (cardIndex: number) => void;
  onFlip?: (cardIndex: number, state: FlashcardFlipState) => void;
  showControls?: boolean;
  showCount?: boolean;
  showProgressBar?: boolean;
}

function getCardsInDisplay(
  currentCard: number,
  deckLength: number,
  cycle: boolean
) {
  if (deckLength <= 0) {
    return [-1, -1, -1];
  }

  if (cycle) {
    return [
      (currentCard - 1 + deckLength) % deckLength,
      currentCard % deckLength,
      (currentCard + 1) % deckLength,
    ];
  }

  return [
    currentCard - 1 < 0 ? -1 : currentCard - 1,
    currentCard,
    currentCard + 1 >= deckLength ? -1 : currentCard + 1,
  ];
}

export function useFlashcardArray({
  cycle = false,
  onFlip,
  deckLength,
  manualFlip,
  disableFlip,
  onCardChange,
  flipDirection,
  showCount = true,
  showControls = true,
  showProgressBar = false,
}: UseFlashcardArrayProps): UseFlashcardArray {
  const [currentCard, setCurrentCardState] = useState(0);
  const totalCards = Math.max(deckLength, 0);

  useEffect(() => {
    if (totalCards <= 0) {
      setCurrentCardState(0);
      return;
    }

    setCurrentCardState((previous) => {
      if (cycle) {
        return ((previous % totalCards) + totalCards) % totalCards;
      }
      return Math.max(0, Math.min(previous, totalCards - 1));
    });
  }, [cycle, totalCards]);

  const cardsInDisplay = useMemo(
    () => getCardsInDisplay(currentCard, totalCards, cycle),
    [currentCard, cycle, totalCards]
  );

  const canGoPrev = useMemo(() => cardsInDisplay[0] !== -1, [cardsInDisplay]);
  const canGoNext = useMemo(() => cardsInDisplay[2] !== -1, [cardsInDisplay]);

  const memoizedOnFlip = useCallback(
    (state: FlashcardFlipState) => {
      onFlip?.(currentCard, state);
    },
    [currentCard, onFlip]
  );

  const flipHook = useFlashcard({
    disableFlip,
    flipDirection,
    manualFlip,
    onFlip: memoizedOnFlip,
  });
  const resetCardState = flipHook.resetCardState;

  const setCurrentCard = useCallback(
    (index: number) => {
      if (totalCards <= 0) {
        setCurrentCardState(0);
        return;
      }

      const nextIndex = cycle
        ? ((index % totalCards) + totalCards) % totalCards
        : Math.max(0, Math.min(index, totalCards - 1));

      resetCardState();
      setCurrentCardState(nextIndex);
      onCardChange?.(nextIndex);
    },
    [cycle, onCardChange, resetCardState, totalCards]
  );

  const nextCard = useCallback(() => {
    if (totalCards <= 0) {
      return;
    }

    const nextIndex = cycle
      ? (currentCard + 1) % totalCards
      : Math.min(currentCard + 1, totalCards - 1);

    if (nextIndex === currentCard) {
      return;
    }

    resetCardState();
    setCurrentCardState(nextIndex);
    onCardChange?.(nextIndex);
  }, [currentCard, cycle, onCardChange, resetCardState, totalCards]);

  const prevCard = useCallback(() => {
    if (totalCards <= 0) {
      return;
    }

    const previousIndex = cycle
      ? (currentCard - 1 + totalCards) % totalCards
      : Math.max(currentCard - 1, 0);

    if (previousIndex === currentCard) {
      return;
    }

    resetCardState();
    setCurrentCardState(previousIndex);
    onCardChange?.(previousIndex);
  }, [currentCard, cycle, onCardChange, resetCardState, totalCards]);

  return {
    canGoNext,
    canGoPrev,
    cardsInDisplay,
    currentCard,
    cycle,
    deckLength: totalCards,
    flipHook,
    nextCard,
    prevCard,
    progressBar: {
      current: totalCards > 0 ? currentCard + 1 : 0,
      percentage:
        totalCards > 0 ? Math.round(((currentCard + 1) / totalCards) * 100) : 0,
      total: totalCards,
    },
    setCurrentCard,
    showControls,
    showCount,
    showProgressBar,
  };
}
