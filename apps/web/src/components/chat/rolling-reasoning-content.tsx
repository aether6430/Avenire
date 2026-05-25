"use client";

import { cn } from "@avenire/ui/lib/utils";
import type { ComponentProps } from "react";
import { memo } from "react";
import {
  ROW_HEIGHT,
  VISIBLE_ROWS,
  WINDOW_HEIGHT,
} from "./rolling-reasoning-shared";

export type ReasoningContentProps = ComponentProps<"div"> & {
  children: string;
};

export const ReasoningContent = memo(
  ({ className, children, ...props }: ReasoningContentProps) => {
    const lines = children
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);

    return (
      <div
        className={cn("relative mt-[3px] overflow-hidden", className)}
        style={{ height: WINDOW_HEIGHT }}
        {...props}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-0"
          style={{
            background:
              "linear-gradient(to bottom, hsl(var(--background)) 15%, transparent 100%)",
            height: ROW_HEIGHT * 1.4,
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0"
          style={{
            background:
              "linear-gradient(to top, hsl(var(--background)) 15%, transparent 100%)",
            height: ROW_HEIGHT * 1.4,
          }}
        />
        <div
          className="relative z-10 whitespace-pre-wrap break-words pl-4 font-mono text-[11px] text-foreground/22 leading-[22px]"
          style={{
            willChange: "transform",
            transform: `translateY(${
              lines.length > VISIBLE_ROWS
                ? -(lines.length - VISIBLE_ROWS) * ROW_HEIGHT
                : 0
            }px)`,
            transition: "transform 220ms ease-out",
          }}
        >
          {lines.join("\n")}
        </div>
      </div>
    );
  }
);
