"use client";

import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useId,
} from "react";
import { Markdown } from "@/components/chat/markdown";
import { type UseFlashcard, useFlashcard } from "@/hooks/use-flashcard";
import { cn } from "@/lib/utils";
import styles from "./react-quizlet-flashcard.module.scss";

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

  let flipType: "auto" | "disable" | "manual" = "auto";
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
    <div className={styles["flashcard-wrapper"]} style={style}>
      {/* biome-ignore lint/a11y/useSemanticElements: This surface needs block layout and rich markdown content while remaining keyboard-operable. */}
      <div
        aria-label={`Flashcard, currently showing ${isFlipped ? "back" : "front"} side`}
        aria-live="polite"
        aria-pressed={isFlipped}
        className={cn(
          styles.flashcard,
          !(localFlipHook.disableFlip || localFlipHook.manualFlip) &&
            "cursor-pointer",
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
          faceClassName={styles.flashcard__front}
          flipType={flipType}
          style={front.style}
        />
        <CardFace
          ariaHidden={!isFlipped}
          className={back.className}
          content={back.html}
          contentIdPrefix="flashcard-back"
          faceClassName={styles.flashcard__back}
          flipType={flipType}
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
  faceClassName,
  flipType,
  style,
}: {
  ariaHidden: boolean;
  className?: string;
  content: ReactNode | string;
  contentIdPrefix: string;
  faceClassName: string;
  flipType: "auto" | "disable" | "manual";
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden={ariaHidden}
      className={faceClassName}
      data-flip-type={flipType}
      style={style}
    >
      <div className={cn(styles["flashcard__face-shell"], className)}>
        <div className={styles["flashcard__face-content"]}>
          <CardFaceContent
            className={
              typeof content === "string"
                ? styles.flashcard__markdown
                : undefined
            }
            content={content}
            idPrefix={contentIdPrefix}
          />
        </div>
      </div>
    </div>
  );
}

export type {
  FlashcardFlipDirection,
  FlashcardFlipState,
} from "@/hooks/use-flashcard";
