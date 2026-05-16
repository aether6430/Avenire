"use client";

import { Button } from "@avenire/ui/components/button";
import { Textarea } from "@avenire/ui/components/textarea";
import { Trash as Trash2 } from "@phosphor-icons/react";
import type { Editor } from "@tiptap/react";
import type { RefObject } from "react";
import { useRef } from "react";
import type { MermaidPopoverState } from "@/components/editor/editor-core";
import {
  useAnchoredPopoverStyle,
  usePopoverOutsideDismiss,
} from "@/components/editor/editor-popover-positioning";

export function MermaidPopover({
  editor,
  value,
  onChange,
  onSave,
  onCancel,
  onDelete,
  scrollContainerRef,
}: {
  editor: Editor;
  value: MermaidPopoverState | null;
  onChange: (next: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const style = useAnchoredPopoverStyle({
    editor,
    popoverRef,
    pos: value?.pos ?? null,
    scrollContainerRef,
  });

  usePopoverOutsideDismiss({
    enabled: Boolean(value),
    onCancel,
    popoverRef,
    shouldIgnoreTarget: (target) =>
      Boolean(target.closest('[data-type="mermaid-diagram"]')),
  });

  if (!value) {
    return null;
  }

  return (
    <div
      className="fixed z-[90] w-[min(28rem,calc(100vw-1.25rem))] rounded-lg border border-border bg-popover p-2.5 shadow-black/10 shadow-lg"
      ref={popoverRef}
      style={style ?? undefined}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-medium text-popover-foreground text-sm">
          Mermaid diagram
        </p>
        <div className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
          ```mermaid
        </div>
      </div>
      <Textarea
        className="min-h-32 w-full resize-y rounded-xl font-mono text-[13px] leading-6"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            onSave();
          } else if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        spellCheck={false}
        value={value.draft}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <Button
          onClick={onDelete}
          onMouseDown={(event) => event.preventDefault()}
          size="sm"
          type="button"
          variant="destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
        <div className="flex gap-2">
          <Button
            onClick={onCancel}
            onMouseDown={(event) => event.preventDefault()}
            size="sm"
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            onMouseDown={(event) => event.preventDefault()}
            size="sm"
            type="button"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
