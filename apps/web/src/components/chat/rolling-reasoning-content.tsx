"use client";

import { cn } from "@avenire/ui/lib/utils";
import type { ComponentProps } from "react";
import { memo } from "react";
import {
  buildOccurrenceKey,
  ROW_HEIGHT,
  VISIBLE_ROWS,
  WINDOW_HEIGHT,
} from "./rolling-reasoning-shared";

export type ReasoningContentProps = ComponentProps<"div"> & {
  children: string;
  workspaceUuid?: string;
};

export const ReasoningContent = memo(
  ({ className, children, ...props }: ReasoningContentProps) => {
    const lines = children
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);
    const seenLineKeys = new Map<string, number>();

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
          className="relative z-10 font-mono text-[11px] text-foreground/40"
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
          {lines.map((line) => (
            <div
              className="flex items-start gap-2 pl-4"
              key={buildOccurrenceKey(line, seenLineKeys)}
              style={{ minHeight: ROW_HEIGHT }}
            >
              <span className="whitespace-pre-wrap break-words leading-5">
                {line}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
