"use client";

import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useId,
} from "react";
import { Markdown } from "@/components/chat/markdown";
import {
  type FlashcardFlipDirection,
  type UseFlashcard,
  useFlashcard,
} from "@/hooks/use-flashcard";
import { cn } from "@/lib/utils";

export interface FlashcardSide {
  className?: string;
  html: ReactNode | string;
  style?: CSSProperties;
}

export interface ReviewFlashcard {
  back: FlashcardSide;
  className?: string;
  front: FlashcardSide;
  style?: CSSProperties;
}

export interface FlashcardProps extends ReviewFlashcard {
  flipHook?: UseFlashcard;
}

const FLIPPED_TRANSFORMS: Record<FlashcardFlipDirection, string> = {
  bt: "[transform:rotateX(180deg)]",
  ltr: "[transform:rotateY(180deg)]",
  rtl: "[transform:rotateY(-180deg)]",
  tb: "[transform:rotateX(-180deg)]",
};

const BACK_TRANSFORMS: Record<FlashcardFlipDirection, string> = {
  bt: "[transform:rotateX(180deg)]",
  ltr: "[transform:rotateY(180deg)]",
  rtl: "[transform:rotateY(-180deg)]",
  tb: "[transform:rotateX(-180deg)]",
};

function CardFaceContent({
  content,
  idPrefix,
  className,
}: {
  content: ReactNode | string;
  idPrefix: string;
  className?: string;
}) {
  const reactId = useId();

  if (typeof content === "string") {
    return (
      <Markdown
        className={cn(
          "max-w-none text-balance text-center text-base leading-relaxed [&_p]:text-center",
          className
        )}
        content={content}
        id={`${idPrefix}-${reactId}`}
        parseIncompleteMarkdown={false}
      />
    );
  }

  return <div className={cn("w-full", className)}>{content}</div>;
}

export function Flashcard({
  style,
  flipHook,
  className,
  front,
  back,
}: FlashcardProps) {
  const localFlipHook = flipHook ?? useFlashcard({});
  const isFlipped = localFlipHook.state === "back";

  let flipType = "auto";
  if (localFlipHook.disableFlip) {
    flipType = "disable";
  } else if (localFlipHook.manualFlip) {
    flipType = "manual";
  }

  const handleFlip = () => {
    if (localFlipHook.manualFlip || localFlipHook.disableFlip) {
      return;
    }
    localFlipHook.flip();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    handleFlip();
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[1.5rem] [perspective:1000px]"
      style={style}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: This surface needs block layout and rich markdown content while remaining keyboard-operable. */}
      <div
        aria-label={`Flashcard, currently showing ${isFlipped ? "back" : "front"} side`}
        aria-live="polite"
        aria-pressed={isFlipped}
        className={cn(
          "absolute inset-0 rounded-[1.5rem] outline-none transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d]",
          !(localFlipHook.disableFlip || localFlipHook.manualFlip) &&
            "cursor-pointer",
          localFlipHook.disableFlip && "cursor-not-allowed opacity-85",
          isFlipped && FLIPPED_TRANSFORMS[localFlipHook.flipDirection],
          className
        )}
        data-dir={localFlipHook.flipDirection}
        data-flip={isFlipped}
        data-flip-type={flipType}
        onClick={handleFlip}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <CardFace
          ariaHidden={isFlipped}
          className={front.className}
          content={front.html}
          contentIdPrefix="flashcard-front"
          style={front.style}
        />
        <CardFace
          ariaHidden={!isFlipped}
          className={cn(
            BACK_TRANSFORMS[localFlipHook.flipDirection],
            back.className
          )}
          content={back.html}
          contentIdPrefix="flashcard-back"
          style={back.style}
        />
      </div>
    </div>
  );
}

function CardFace({
  ariaHidden,
  className,
  content,
  contentIdPrefix,
  style,
}: {
  ariaHidden: boolean;
  className?: string;
  content: ReactNode | string;
  contentIdPrefix: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden={ariaHidden}
      className={cn(
        "absolute inset-0 flex h-full w-full overflow-hidden rounded-[1.5rem] border border-border/50 bg-card/95 p-6 text-card-foreground shadow-[0_0_2.5rem_0_rgba(55,53,47,0.12)] [backface-visibility:hidden] sm:p-8 md:p-10 dark:shadow-[0_0_2.5rem_0_rgba(0,0,0,0.28)]",
        className
      )}
      style={style}
    >
      <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-auto">
        <CardFaceContent
          className={typeof content === "string" ? "w-full" : undefined}
          content={content}
          idPrefix={contentIdPrefix}
        />
      </div>
    </div>
  );
}

export type {
  FlashcardFlipDirection,
  FlashcardFlipState,
} from "@/hooks/use-flashcard";
