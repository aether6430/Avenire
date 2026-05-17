"use client";

import { cn } from "@avenire/ui/lib/utils";
import { CaretRight as ChevronRight } from "@phosphor-icons/react";
import { CaretDown as ChevronDown } from "@phosphor-icons/react/CaretDown";
import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { ReasoningContent } from "./rolling-reasoning-content";
import { ThinkingDots } from "./rolling-reasoning-shared";
import { Shimmer } from "./shimmer";

export interface ReasoningActionProps {
  className?: string;
  content: string;
  isStreaming: boolean;
  workspaceUuid?: string;
}

export function ReasoningAction({
  className,
  content,
  isStreaming,
  workspaceUuid,
}: ReasoningActionProps) {
  if (!content) {
    return null;
  }

  return (
    <ReasoningBlock
      className={className}
      content={content}
      isStreaming={isStreaming}
      workspaceUuid={workspaceUuid}
    />
  );
}

function ReasoningPanel({
  content,
  open,
  workspaceUuid,
}: {
  content: string;
  open: boolean;
  workspaceUuid?: string;
}) {
  return (
    <div
      role="region"
      style={{
        maxHeight: open ? "12rem" : "0px",
        opacity: open ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 360ms ease, opacity 360ms ease",
      }}
    >
      <ReasoningContent workspaceUuid={workspaceUuid}>
        {content}
      </ReasoningContent>
    </div>
  );
}

function ReasoningBlock({
  className,
  content,
  isStreaming,
  workspaceUuid,
}: ReasoningActionProps) {
  const [open, setOpen] = useState(false);
  const triggerId = useId();
  const panelId = useId();
  const summary = isStreaming
    ? "thinking..."
    : content.length > 0
      ? "ready"
      : "";

  useEffect(() => {
    if (isStreaming) {
      setOpen(true);
      return;
    }
    setOpen(false);
  }, [isStreaming]);

  return (
    <div className={cn("mb-0.5", className)}>
      {isStreaming ? (
        <div
          aria-label={`Reasoning: ${summary || "starting"}`}
          aria-live="polite"
          className="flex h-7 items-center gap-2"
          role="status"
        >
          <Shimmer as="span" className="font-semibold text-foreground text-sm">
            Reasoning
          </Shimmer>
          {summary ? (
            <span aria-hidden="true" className="text-[11px] text-foreground/26">
              {summary}
            </span>
          ) : null}
          <ThinkingDots />
        </div>
      ) : (
        <button
          aria-controls={panelId}
          aria-expanded={open}
          className={cn(
            "group flex h-7 w-full items-center gap-2 rounded-sm text-left",
            "text-foreground/52 transition-colors duration-200 hover:text-foreground/72",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          )}
          id={triggerId}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span className="font-semibold text-sm">Reasoning</span>
          {summary ? (
            <span className="text-[11px] text-foreground/26">{summary}</span>
          ) : null}
          <span
            aria-hidden="true"
            className="ml-0.5 text-foreground/22 transition-colors duration-200 group-hover:text-foreground/42"
            style={{
              display: "inline-flex",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 250ms ease-in-out",
            }}
          >
            <ChevronRight className="size-3 rotate-90" strokeWidth={2} />
          </span>
        </button>
      )}

      {content ? (
        <ReasoningPanel
          content={content}
          open={isStreaming || open}
          workspaceUuid={workspaceUuid}
        />
      ) : null}
    </div>
  );
}

export function RollingStatusHeader({
  children,
  className,
  done,
  interactive = true,
  onClick,
  open,
  summary,
  title,
}: {
  children?: ReactNode;
  className?: string;
  done: boolean;
  interactive?: boolean;
  onClick?: () => void;
  open?: boolean;
  summary?: ReactNode;
  title: string;
}) {
  if (!done) {
    return (
      <div
        aria-label={`${title}: ${typeof summary === "string" ? summary : "running"}`}
        aria-live="polite"
        className={cn("flex h-7 items-center gap-2", className)}
        role="status"
      >
        <Shimmer as="span" className="font-semibold text-foreground text-sm">
          {title}
        </Shimmer>
        {summary ? (
          <span aria-hidden="true" className="text-[11px] text-foreground/26">
            {summary}
          </span>
        ) : null}
        <ThinkingDots />
        {children}
      </div>
    );
  }

  if (!interactive) {
    return (
      <div
        className={cn(
          "group flex h-7 w-full items-center gap-2 rounded-sm text-left text-foreground/52",
          className
        )}
      >
        <span className="font-semibold text-sm">{title}</span>
        {summary ? (
          <span className="text-[11px] text-foreground/26">{summary}</span>
        ) : null}
        <span
          aria-hidden="true"
          className="ml-0.5 text-foreground/22"
          style={{
            display: "inline-flex",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 250ms ease-in-out",
          }}
        >
          <ChevronDown className="size-3" strokeWidth={2} />
        </span>
        {children}
      </div>
    );
  }

  return (
    <button
      aria-expanded={open}
      className={cn(
        "group flex h-7 w-full items-center gap-2 rounded-sm text-left",
        "text-foreground/52 transition-colors duration-200 hover:text-foreground/72",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        className
      )}
      onClick={onClick}
      type="button"
    >
      <span className="font-semibold text-sm">{title}</span>
      {summary ? (
        <span className="text-[11px] text-foreground/26">{summary}</span>
      ) : null}
      <span
        aria-hidden="true"
        className="ml-0.5 text-foreground/22 transition-colors duration-200 group-hover:text-foreground/42"
        style={{
          display: "inline-flex",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 250ms ease-in-out",
        }}
      >
        <ChevronDown className="size-3" strokeWidth={2} />
      </span>
      {children}
    </button>
  );
}

export function RollingPreviewPanel({
  children,
  className,
  open,
}: {
  children: ReactNode;
  className?: string;
  open: boolean;
}) {
  return (
    <div
      aria-hidden={!open}
      style={{
        maxHeight: open ? "18rem" : "0px",
        opacity: open ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 360ms ease, opacity 360ms ease",
      }}
    >
      <div
        className={cn(
          "mt-[3px] overflow-hidden rounded border border-foreground/[0.07] bg-foreground/[0.025]",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
