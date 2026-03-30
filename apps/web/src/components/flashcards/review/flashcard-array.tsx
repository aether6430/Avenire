"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@avenire/ui/components/progress";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import {
  Flashcard,
  type ReviewFlashcard,
} from "@/components/flashcards/review/flashcard";
import {
  type UseFlashcardArray,
  useFlashcardArray,
} from "@/hooks/use-flashcard-array";
import { cn } from "@/lib/utils";

export interface FlashcardArrayProps {
  className?: string;
  deck: ReviewFlashcard[];
  flipArrayHook?: UseFlashcardArray;
}

function SiblingCard({ direction }: { direction: "left" | "right" }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 h-full opacity-0 transition-all duration-200",
        direction === "left"
          ? "[transform:translateX(-10%)_rotateY(10deg)_translateZ(0)]"
          : "[transform:translateX(10%)_rotateY(-10deg)_translateZ(0)]"
      )}
    >
      <div className="h-full rounded-[1.5rem] border border-border/35 bg-background/40 shadow-none" />
    </div>
  );
}

export function FlashcardArray({
  deck,
  className,
  flipArrayHook,
}: FlashcardArrayProps) {
  const temporaryFlipArrayHook = useFlashcardArray({
    deckLength: deck.length,
  });
  const localFlipArrayHook = flipArrayHook ?? temporaryFlipArrayHook;

  if (deck.length === 0 || localFlipArrayHook.cardsInDisplay[1] === -1) {
    return null;
  }

  const activeCard = deck[localFlipArrayHook.cardsInDisplay[1]];

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      <section
        aria-label={`Flashcard ${localFlipArrayHook.currentCard + 1} of ${localFlipArrayHook.deckLength}`}
        aria-live="polite"
        className="relative h-[22rem] w-full [perspective:1000px] sm:h-[24rem] md:h-[26rem]"
      >
        {localFlipArrayHook.cardsInDisplay[0] !== -1 ? (
          <SiblingCard direction="left" />
        ) : null}

        <div className="absolute inset-0 z-10">
          <Flashcard
            back={activeCard.back}
            className={activeCard.className}
            flipHook={localFlipArrayHook.flipHook}
            front={activeCard.front}
            style={activeCard.style}
          />
        </div>

        {localFlipArrayHook.cardsInDisplay[2] !== -1 ? (
          <SiblingCard direction="right" />
        ) : null}
      </section>

      {localFlipArrayHook.showProgressBar ? (
        <Progress
          className="gap-2"
          value={localFlipArrayHook.progressBar.percentage}
        >
          <div className="flex w-full items-center justify-between gap-3 text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
            <ProgressLabel>Review Progress</ProgressLabel>
            <ProgressValue>
              {() =>
                `${localFlipArrayHook.progressBar.current}/${localFlipArrayHook.progressBar.total}`
              }
            </ProgressValue>
          </div>
        </Progress>
      ) : null}

      {localFlipArrayHook.showControls || localFlipArrayHook.showCount ? (
        <div className="flex h-10 items-center justify-center gap-4">
          {localFlipArrayHook.showControls ? (
            <Button
              aria-label="Previous card"
              disabled={!localFlipArrayHook.canGoPrev}
              onClick={() => localFlipArrayHook.prevCard()}
              size="icon-lg"
              type="button"
              variant="outline"
            >
              <ArrowLeft className="size-4" />
            </Button>
          ) : null}

          {localFlipArrayHook.showCount ? (
            <span className="min-w-16 text-center font-medium text-sm tabular-nums">
              {localFlipArrayHook.currentCard + 1}/{deck.length}
            </span>
          ) : null}

          {localFlipArrayHook.showControls ? (
            <Button
              aria-label="Next card"
              disabled={!localFlipArrayHook.canGoNext}
              onClick={() => localFlipArrayHook.nextCard()}
              size="icon-lg"
              type="button"
              variant="outline"
            >
              <ArrowRight className="size-4" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
