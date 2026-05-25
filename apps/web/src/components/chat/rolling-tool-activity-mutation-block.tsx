"use client";

import type { MutationAction } from "@/components/chat/rolling-tool-activity-types";
import { ThinkingDots } from "./rolling-reasoning-shared";

export function MutationBlock({ action }: { action: MutationAction }) {
  if (action.kind === "error") {
    return (
      <div
        className="mb-1 flex items-baseline gap-2 text-sm"
        role="listitem"
        style={{
          opacity: 1,
          transform: "translateY(0)",
        }}
      >
        <span className="font-semibold text-destructive">Error</span>
        <span className="font-mono text-[12px] text-destructive/80">
          {action.error ?? "Unknown error"}
        </span>
        {action.pending ? (
          <span className="font-mono text-[11px] text-foreground/28">
            running
            <ThinkingDots />
          </span>
        ) : null}
      </div>
    );
  }

  if (action.kind === "flashcards") {
    return (
      <div
        className="mb-1 flex items-baseline gap-2 text-sm"
        role="listitem"
        style={{
          opacity: 1,
          transform: "translateY(0)",
        }}
      >
        <span className="font-semibold text-foreground/72">Mindset Set</span>
        <span className="font-mono text-[12px] text-foreground/62">
          {action.preview?.title || action.value || "Mindset Set"}
        </span>
        {action.pending ? (
          <span className="font-mono text-[11px] text-foreground/28">
            creating
            <ThinkingDots />
          </span>
        ) : null}
      </div>
    );
  }

  if (action.kind === "notes") {
    const summary = action.preview
      ? `${action.preview.noteCount} note${action.preview.noteCount === 1 ? "" : "s"} ${action.preview.operation}`
      : null;

    return (
      <div
        className="mb-1 overflow-hidden rounded-xl border border-foreground/[0.08] bg-foreground/[0.03]"
        role="listitem"
        style={{
          opacity: 1,
          transform: "translateY(0)",
        }}
      >
        <div className="flex min-h-16 items-center justify-between gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[15px] text-foreground/72">
              {action.pending ? "Generating notes" : "Notes updated"}
            </p>
            <p className="truncate font-semibold text-base text-foreground">
              {action.preview?.title || action.value || "Workspace notes"}
            </p>
            {summary ? (
              <p className="mt-0.5 font-mono text-[11px] text-foreground/35">
                {summary}
              </p>
            ) : null}
          </div>
          {action.pending ? (
            <div className="shrink-0 border-foreground/[0.08] border-l pl-3">
              <span className="font-mono text-[11px] text-foreground/42">
                writing
                <ThinkingDots />
              </span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (action.kind === "quiz") {
    return (
      <div
        className="mb-1 flex items-baseline gap-2 text-sm"
        role="listitem"
        style={{
          opacity: 1,
          transform: "translateY(0)",
        }}
      >
        <span className="font-semibold text-foreground/72">Quiz</span>
        <span className="font-mono text-[12px] text-foreground/62">
          {action.value || "generating..."}
        </span>
        {action.pending ? (
          <span className="font-mono text-[11px] text-foreground/28">
            creating
            <ThinkingDots />
          </span>
        ) : null}
      </div>
    );
  }

  if (action.kind === "misconception") {
    const confidence =
      typeof action.preview?.confidence === "number"
        ? `${Math.round(action.preview.confidence * 100)}%`
        : null;

    return (
      <div
        className="mb-1 flex items-baseline gap-2 text-sm"
        role="listitem"
        style={{
          opacity: 1,
          transform: "translateY(0)",
        }}
      >
        <span className="font-semibold text-foreground/72">Misconception</span>
        <span className="min-w-0 truncate font-mono text-[12px] text-foreground/62">
          {action.preview?.concept || action.value || "learning memory"}
        </span>
        {confidence ? (
          <span className="font-mono text-[11px] text-foreground/35">
            {confidence}
          </span>
        ) : null}
        {action.pending ? (
          <span className="font-mono text-[11px] text-foreground/28">
            checking
            <ThinkingDots />
          </span>
        ) : null}
      </div>
    );
  }

  const path =
    action.kind === "move" ? (action.to ?? action.from) : action.path;
  const pathParts = path.split("/");
  const filename = pathParts.pop() ?? path;
  const directory = pathParts.length > 0 ? `${pathParts.join("/")}/` : "";
  const label =
    action.kind === "create"
      ? "Create"
      : action.kind === "delete"
        ? "Delete"
        : action.kind === "move"
          ? "Move"
          : "Edit";

  return (
    <div
      className="mb-1 flex items-baseline gap-2 text-sm"
      role="listitem"
      style={{
        opacity: 1,
        transform: "translateY(0)",
      }}
    >
      <span className="font-semibold text-foreground/72">{label}</span>
      <span className="font-mono text-[12px] text-foreground/62">
        {filename}
      </span>
      <span className="font-mono text-[11px] text-foreground/20">
        {directory}
      </span>
      {action.kind === "move" ? (
        <span className="font-mono text-[11px] text-foreground/32">
          {action.from}
          {action.to ? ` -> ${action.to}` : ""}
        </span>
      ) : null}
      {action.pending ? (
        <span className="font-mono text-[11px] text-foreground/28">
          running
          <ThinkingDots />
        </span>
      ) : null}
    </div>
  );
}
