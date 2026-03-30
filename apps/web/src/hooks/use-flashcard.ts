"use client";

import { useCallback, useMemo, useState } from "react";

export type FlashcardFlipState = "front" | "back";
export type FlashcardFlipDirection = "rtl" | "ltr" | "tb" | "bt";

export interface UseFlashcardProps {
  disableFlip?: boolean;
  flipDirection?: FlashcardFlipDirection;
  manualFlip?: boolean;
  onFlip?: (state: FlashcardFlipState) => void;
}

export interface UseFlashcard {
  disableFlip: boolean;
  flip: (state?: FlashcardFlipState) => void;
  flipDirection: FlashcardFlipDirection;
  manualFlip: boolean;
  resetCardState: () => void;
  state: FlashcardFlipState;
}

export function useFlashcard({
  onFlip,
  disableFlip = false,
  manualFlip = false,
  flipDirection = "bt",
}: UseFlashcardProps): UseFlashcard {
  const [flashcardSide, setFlashcardSide] =
    useState<FlashcardFlipState>("front");

  const memoizedOnFlip = useCallback(
    (state: FlashcardFlipState) => {
      onFlip?.(state);
    },
    [onFlip]
  );

  const flip = useCallback(
    (state?: FlashcardFlipState) => {
      if (disableFlip) {
        return;
      }

      setFlashcardSide((previous) => {
        const nextState = state ?? (previous === "front" ? "back" : "front");
        if (nextState !== previous) {
          memoizedOnFlip(nextState);
        }
        return nextState;
      });
    },
    [disableFlip, memoizedOnFlip]
  );

  const resetCardState = useCallback(() => {
    setFlashcardSide("front");
  }, []);

  return useMemo(
    () => ({
      disableFlip,
      flip,
      flipDirection,
      manualFlip,
      resetCardState,
      state: flashcardSide,
    }),
    [
      disableFlip,
      flip,
      flipDirection,
      flashcardSide,
      manualFlip,
      resetCardState,
    ]
  );
}
