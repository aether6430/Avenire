"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@avenire/ui/components/dialog";
import { cn } from "@avenire/ui/lib/utils";
import { useEffect, useRef, useState } from "react";
import {
  FlashcardArray,
  type IFlashcard,
  type useFlashcardArray,
} from "react-quizlet-flashcard";
import { MemoizedMarkdownSurface as Markdown } from "@/components/chat/markdown-surface";
import {
  BACK_FACE_MAX_FONT_SIZE,
  BACK_FACE_MIN_FONT_SIZE,
  FRONT_FACE_MAX_FONT_SIZE,
  FRONT_FACE_MIN_FONT_SIZE,
  RATING_STYLES,
  type Rating,
  type StudyStatus,
} from "@/components/flashcards/flashcard-set-detail-model";
import type { FlashcardReviewQueueItem } from "@/lib/flashcards";

export function StudyCardFace({
  align = "center",
  content,
  id,
  notes,
}: {
  align?: "center" | "left";
  content: string;
  id: string;
  notes?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [fontSize, setFontSize] = useState(
    align === "center" ? FRONT_FACE_MAX_FONT_SIZE : BACK_FACE_MAX_FONT_SIZE
  );

  useEffect(() => {
    const container = containerRef.current;
    const contentNode = contentRef.current;
    if (!(container && contentNode)) {
      return;
    }

    let frame = 0;
    let observer: ResizeObserver | null = null;
    const maxFontSize =
      align === "center" ? FRONT_FACE_MAX_FONT_SIZE : BACK_FACE_MAX_FONT_SIZE;
    const minFontSize =
      align === "center" ? FRONT_FACE_MIN_FONT_SIZE : BACK_FACE_MIN_FONT_SIZE;

    const fitContent = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nextSize = (() => {
          for (let size = maxFontSize; size >= minFontSize; size -= 1) {
            contentNode.style.fontSize = `${size}px`;
            if (
              contentNode.scrollHeight <= container.clientHeight &&
              contentNode.scrollWidth <= container.clientWidth
            ) {
              return size;
            }
          }

          return minFontSize;
        })();

        contentNode.style.fontSize = `${nextSize}px`;
        setFontSize((current) => (current === nextSize ? current : nextSize));
      });
    };

    fitContent();

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(fitContent);
      observer.observe(container);
      observer.observe(contentNode);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [align]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 overflow-hidden",
        align === "center" ? "items-center justify-center" : "items-stretch"
      )}
      ref={containerRef}
    >
      <div
        className="w-full min-w-0 overflow-y-auto overflow-x-hidden px-5 py-5 sm:px-6 sm:py-6"
        ref={contentRef}
        style={{ fontSize }}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-[34rem] flex-col gap-4",
            align === "center"
              ? "min-h-full justify-center"
              : "min-h-fit justify-start"
          )}
        >
          <Markdown
            className={cn(
              "max-w-none text-card-foreground text-inherit leading-[1.6] [&_code:not(pre_code)]:rounded-md [&_code:not(pre_code)]:border [&_code:not(pre_code)]:border-border [&_code:not(pre_code)]:bg-secondary [&_code:not(pre_code)]:px-1.5 [&_code:not(pre_code)]:py-0.5 [&_ol]:text-inherit [&_p]:text-inherit [&_pre.shiki]:rounded-xl [&_pre.shiki]:border [&_pre.shiki]:border-border [&_pre.shiki]:bg-secondary [&_strong]:text-inherit [&_ul]:text-inherit",
              align === "center" &&
                "text-balance text-center [&_li]:text-left [&_p]:text-center"
            )}
            content={content}
            parseIncompleteMarkdown={false}
          />
          {notes ? (
            <div className="rounded-md border border-border/70 bg-muted/50 px-3 py-3">
              <p className="mb-2 font-medium text-[0.65rem] text-muted-foreground uppercase tracking-[0.18em]">
                Notes
              </p>
              <Markdown
                className="max-w-none text-[0.92em] text-card-foreground leading-[1.6] [&_code:not(pre_code)]:rounded-md [&_code:not(pre_code)]:border [&_code:not(pre_code)]:border-border [&_code:not(pre_code)]:bg-secondary [&_code:not(pre_code)]:px-1.5 [&_code:not(pre_code)]:py-0.5 [&_pre.shiki]:rounded-xl [&_pre.shiki]:border [&_pre.shiki]:border-border [&_pre.shiki]:bg-secondary"
                content={notes}
                parseIncompleteMarkdown={false}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RatingButton({
  disabled,
  label,
  onClick,
  rating,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
  rating: Rating;
}) {
  return (
    <Button
      className={cn(
        "h-7 justify-start rounded-md border px-2.5 font-medium text-[0.72rem] tracking-tight transition-colors sm:justify-center",
        RATING_STYLES[rating],
        disabled &&
          "border-border/70 bg-muted/30 text-muted-foreground hover:border-border/70 hover:bg-muted/30"
      )}
      disabled={disabled}
      onClick={onClick}
      size="sm"
      type="button"
      variant="outline"
    >
      {label}
    </Button>
  );
}

export function FlashcardSetDetailStudyDialog({
  activeCard,
  onOpenChange,
  onSubmitReview,
  open,
  reviewBusy,
  reviewCards,
  reviewArrayHook,
  setTitle,
  studyError,
  studyIndex,
  studyProgress,
  studyRevealed,
  studySessionReviewed,
  studySessionTotal,
  studyStatus,
  onFlipCard,
}: {
  activeCard: FlashcardReviewQueueItem | null;
  onFlipCard: (targetSide: "front" | "back") => void;
  onOpenChange: (open: boolean) => void;
  onSubmitReview: (rating: Rating) => void;
  open: boolean;
  reviewBusy: boolean;
  reviewCards: Array<IFlashcard & { id: string }>;
  reviewArrayHook: ReturnType<typeof useFlashcardArray>;
  setTitle: string;
  studyError: string | null;
  studyIndex: number;
  studyProgress: { current: number; percentage: number; total: number };
  studyRevealed: boolean;
  studySessionReviewed: number;
  studySessionTotal: number;
  studyStatus: StudyStatus;
}) {
  let studySessionContent = (
    <div className="rounded-xl border border-border/50 border-dashed bg-muted/20 px-5 py-10 text-center text-muted-foreground text-xs">
      No cards are queued right now.
    </div>
  );

  if (studyStatus === "loading") {
    studySessionContent = (
      <div className="rounded-xl border border-border/50 bg-muted/20 px-5 py-10 text-center text-muted-foreground text-xs">
        Loading review queue…
      </div>
    );
  } else if (studyStatus === "error") {
    studySessionContent = (
      <div className="rounded-xl border border-rose-300/70 bg-rose-50 px-5 py-10 text-center text-rose-700 text-xs dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
        {studyError ?? "Unable to start the review session."}
      </div>
    );
  } else if (studySessionTotal > 0 && !activeCard) {
    studySessionContent = (
      <div className="rounded-xl border border-border/50 bg-muted/20 px-5 py-10 text-center">
        <p className="font-medium text-sm">Session complete</p>
        <p className="mt-2 text-muted-foreground text-xs">
          You reviewed all {studySessionTotal} cards in this session.
        </p>
      </div>
    );
  } else if (activeCard) {
    studySessionContent = (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8">
        <div className="flex w-full items-end justify-between gap-4 px-0.5">
          <div className="min-w-0">
            <p className="font-medium text-[0.68rem] text-muted-foreground uppercase tracking-[0.22em]">
              Review Progress
            </p>
            <p className="mt-1 font-medium text-sm tabular-nums">
              {studyProgress.current}/{studyProgress.total}
            </p>
          </div>
          <div className="w-full max-w-44">
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary/80">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${studyProgress.percentage}%` }}
              />
            </div>
          </div>
        </div>
        <FlashcardArray deck={reviewCards} flipArrayHook={reviewArrayHook} />
      </div>
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="h-[100dvh] w-full overflow-hidden border-border/60 p-0 sm:h-[88vh] sm:w-[min(42rem,calc(100vw-1.5rem))]"
        largeWidth
      >
        <div className="relative flex h-full flex-col overflow-hidden bg-background">
          <DialogHeader className="border-border/20 border-b px-4 py-2.5 sm:px-5 sm:py-4">
            <div className="space-y-1.5 pr-8">
              <p className="font-medium text-[0.7rem] text-muted-foreground uppercase tracking-[0.24em]">
                Mindset Session
              </p>
              <div className="space-y-0.5">
                <DialogTitle className="text-balance pr-2 font-semibold text-lg tracking-tight sm:text-[1.85rem]">
                  {setTitle}
                </DialogTitle>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Tap the card to flip. Tap a rating to advance.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="relative flex min-h-0 flex-1 flex-col gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-4 md:px-5 md:py-4">
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden py-1">
              {studySessionContent}
            </div>

            <div className="space-y-1.5 px-0.5 pb-0.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  className="h-6 rounded-md px-2.5 text-xs"
                  disabled={!activeCard}
                  onClick={() => onFlipCard(studyRevealed ? "front" : "back")}
                  type="button"
                  variant="outline"
                >
                  {studyRevealed ? "Hide answer" : "Reveal answer"}
                </Button>
                <span className="hidden text-muted-foreground text-xs sm:inline">
                  Space to flip · 1-4 to grade
                </span>
              </div>
              {studyError ? (
                <p className="text-rose-600 text-xs dark:text-rose-300">
                  {studyError}
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                <RatingButton
                  disabled={reviewBusy || !studyRevealed || !activeCard}
                  label="1 · Again"
                  onClick={() => onSubmitReview("again")}
                  rating="again"
                />
                <RatingButton
                  disabled={reviewBusy || !studyRevealed || !activeCard}
                  label="2 · Hard"
                  onClick={() => onSubmitReview("hard")}
                  rating="hard"
                />
                <RatingButton
                  disabled={reviewBusy || !studyRevealed || !activeCard}
                  label="3 · Good"
                  onClick={() => onSubmitReview("good")}
                  rating="good"
                />
                <RatingButton
                  disabled={reviewBusy || !studyRevealed || !activeCard}
                  label="4 · Easy"
                  onClick={() => onSubmitReview("easy")}
                  rating="easy"
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
