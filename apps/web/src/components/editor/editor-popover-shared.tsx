"use client";

import { Input } from "@avenire/ui/components/input";
import { Textarea } from "@avenire/ui/components/textarea";
import { cn } from "@avenire/ui/lib/utils";
import type { KeyboardEvent, ReactNode } from "react";

const LATEX_TOKEN_REGEX =
  /(%.*$|\\[A-Za-z]+|\\.|[{}[\]()]|[_^&]|(?:\d+\.\d+|\d+))/gm;

function highlightLatex(source: string) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of source.matchAll(LATEX_TOKEN_REGEX)) {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push(
        <span key={`plain-${lastIndex}`}>{source.slice(lastIndex, index)}</span>
      );
    }

    let className = "token-symbol";

    if (token.startsWith("%")) {
      className = "token-comment";
    } else if (token.startsWith("\\")) {
      className = "token-command";
    } else if (/^\d/.test(token)) {
      className = "token-number";
    }

    parts.push(
      <span className={className} key={`token-${index}`}>
        {token}
      </span>
    );

    lastIndex = index + token.length;
  }

  if (lastIndex < source.length) {
    parts.push(
      <span key={`tail-${lastIndex}`}>{source.slice(lastIndex)}</span>
    );
  }

  if (parts.length === 0) {
    return <span>&nbsp;</span>;
  }

  return parts;
}

export function HighlightedTextarea({
  compact = false,
  value,
  onChange,
  onKeyDown,
}: {
  compact?: boolean;
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-background",
        compact ? "shadow-none" : "shadow-sm"
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-[13px] leading-6",
          compact ? "text-xs" : "text-[13px]"
        )}
      >
        {highlightLatex(value)}
      </div>
      <Textarea
        className={cn(
          "relative min-h-28 w-full resize-y border-0 bg-transparent font-mono text-[13px] text-transparent leading-6 caret-foreground shadow-none focus-visible:ring-0",
          compact ? "min-h-24 text-xs" : "min-h-28"
        )}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        value={value}
      />
    </div>
  );
}

export function InlineMathInput({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <Input
      autoFocus
      className="h-9 font-mono text-sm"
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          onSave();
          return;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          onSave();
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      spellCheck={false}
      value={value}
    />
  );
}
