"use client";

import { cn } from "@avenire/ui/lib/utils";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface FlashcardFlipCardProps {
  back: ReactNode;
  backBodyClassName?: string;
  backMeta?: ReactNode;
  className?: string;
  flipped: boolean;
  front: ReactNode;
  frontBodyClassName?: string;
  frontMeta?: ReactNode;
  onFlippedChange: (next: boolean) => void;
  surfaceClassName?: string;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function FlashcardFlipCard({
  back,
  backBodyClassName,
  backMeta,
  className,
  flipped,
  front,
  frontBodyClassName,
  frontMeta,
  onFlippedChange,
  surfaceClassName,
}: FlashcardFlipCardProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className={cn("[perspective:1600px]", className)}>
      <button
        aria-label={flipped ? "Show prompt side" : "Show answer side"}
        aria-pressed={flipped}
        className="group block h-full min-h-[22rem] w-full text-left"
        onClick={() => onFlippedChange(!flipped)}
        type="button"
      >
        <div
          className={cn(
            "relative h-full min-h-[22rem] rounded-xl border border-border/70 bg-card/95 [transform-style:preserve-3d]",
            reduceMotion
              ? "transition-opacity duration-150 ease-[var(--ease-out)]"
              : "transition-transform duration-[350ms] ease-[var(--ease-in-out)]",
            surfaceClassName,
            flipped && !reduceMotion && "[transform:rotateY(180deg)]",
            // Under reduced motion, hide the inactive face via opacity on faces below.
            reduceMotion && flipped && "opacity-100"
          )}
        >
          <CardFace
            bodyClassName={frontBodyClassName}
            className={
              reduceMotion
                ? flipped
                  ? "pointer-events-none opacity-0"
                  : "opacity-100"
                : undefined
            }
            meta={frontMeta}
          >
            {front}
          </CardFace>
          <CardFace
            bodyClassName={backBodyClassName}
            className={cn(
              "[transform:rotateY(180deg)]",
              reduceMotion &&
                (flipped
                  ? "pointer-events-auto opacity-100 [transform:none]"
                  : "pointer-events-none opacity-0 [transform:none]")
            )}
            meta={backMeta}
            reverse
          >
            {back}
          </CardFace>
        </div>
      </button>
    </div>
  );
}

function CardFace({
  children,
  bodyClassName,
  className,
  meta,
  reverse = false,
}: {
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
  meta?: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex h-full flex-col justify-between gap-6 rounded-xl bg-card px-5 py-5 [backface-visibility:hidden]",
        reverse && "[backface-visibility:hidden]",
        className
      )}
    >
      <div
        className={cn(
          "flex min-h-0 flex-1 items-center justify-center overflow-auto",
          bodyClassName
        )}
      >
        {children}
      </div>
      {meta ? (
        <div className="border-border/70 border-t pt-3 text-muted-foreground text-xs">
          {meta}
        </div>
      ) : null}
    </div>
  );
}
