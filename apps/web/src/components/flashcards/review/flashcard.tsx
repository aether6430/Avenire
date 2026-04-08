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
    <div
      className={cn(
        "flashcard-wrapper bottom-[10%] clear-left h-full w-full rounded-[16px]",
        "[perspective:1000px] [transform:none_!important]",
        "[--back-bg:#ffffff] [--box-shadow:0_0_2.5rem_0_rgba(0,0,0,0.16)] [--front-bg:#ffffff]"
      )}
      style={style}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: This surface needs block layout and rich markdown content while remaining keyboard-operable. */}
      <div
        aria-label={`Flashcard, currently showing ${isFlipped ? "back" : "front"} side`}
        aria-live="polite"
        aria-pressed={isFlipped}
        className={cn(
          "absolute top-0 left-0 h-full w-full rounded-[inherit] bg-transparent",
          "transition-[transform,opacity] duration-[450ms] [transform-style:preserve-3d]",
          "[&_*]:box-border",
          "[&[data-flip=true][data-dir=rtl]]:[transform:rotateY(-180deg)_!important]",
          "[&[data-flip=true][data-dir=ltr]]:[transform:rotateY(180deg)_!important]",
          "[&[data-flip=true][data-dir=tb]]:[transform:rotateX(-180deg)_!important]",
          "[&[data-flip=true][data-dir=bt]]:[transform:rotateX(180deg)_!important]",
          "[&[data-dir=rtl]_.flashcard-back]:[transform:rotateY(-180deg)_!important]",
          "[&[data-dir=ltr]_.flashcard-back]:[transform:rotateY(180deg)_!important]",
          "[&[data-dir=tb]_.flashcard-back]:[transform:rotateX(-180deg)_!important]",
          "[&[data-dir=bt]_.flashcard-back]:[transform:rotateX(180deg)_!important]",
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
          faceClassName="flashcard-front bg-[var(--front-bg)]"
          flipType={flipType}
          style={front.style}
        />
        <CardFace
          ariaHidden={!isFlipped}
          className={back.className}
          content={back.html}
          contentIdPrefix="flashcard-back"
          faceClassName="flashcard-back bg-[var(--back-bg)]"
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
      className={cn(
        "absolute top-0 left-0 h-full w-full overflow-hidden rounded-[inherit] text-[#111827]",
        "shadow-[var(--box-shadow)] [backface-visibility:hidden]",
        "data-[flip-type=auto]:cursor-pointer data-[flip-type=disable]:cursor-not-allowed data-[flip-type=manual]:cursor-auto",
        faceClassName
      )}
      data-flip-type={flipType}
      style={style}
    >
      <div
        className={cn(
          "flex h-full w-full items-center justify-center overflow-hidden rounded-[inherit] border p-6",
          "border-border/50 bg-card text-card-foreground sm:p-8 md:p-10",
          className
        )}
      >
        <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-auto">
          <CardFaceContent
            className={
              typeof content === "string"
                ? "w-full max-w-none text-balance text-center text-base leading-relaxed [&_p]:text-center"
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
