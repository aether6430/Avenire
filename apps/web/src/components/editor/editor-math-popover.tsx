"use client";

import { Button } from "@avenire/ui/components/button";
import { Trash as Trash2 } from "@phosphor-icons/react";

import type { Editor } from "@tiptap/react";
import { AnimatePresence, motion } from "motion/react";
import type { RefObject } from "react";
import { useRef } from "react";
import type { MathPopoverState } from "@/components/editor/editor-core";
import {
  useAnchoredPopoverStyle,
  usePopoverOutsideDismiss,
} from "@/components/editor/editor-popover-positioning";
import {
  HighlightedTextarea,
  InlineMathInput,
} from "@/components/editor/editor-popover-shared";

export function MathPopover({
  editor,
  value,
  onChange,
  onSave,
  onCancel,
  onDelete,
  scrollContainerRef,
}: {
  editor: Editor;
  value: MathPopoverState | null;
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
      Boolean(
        target.closest("[data-type='inline-math'], [data-type='block-math']")
      ),
  });

  return (
    <AnimatePresence>
      {value ? (
        <motion.div
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className={
            value.kind === "inlineMath"
              ? "fixed z-[90] w-[min(26rem,calc(100vw-1rem))] rounded-lg border border-border bg-popover p-2 shadow-black/10 shadow-lg"
              : "fixed z-[90] w-[min(22rem,calc(100vw-1.25rem))] rounded-lg border border-border bg-popover p-2.5 shadow-black/10 shadow-lg"
          }
          data-motion-managed="true"
          data-slot="editor-floating-popover"
          exit={{ opacity: 0, scale: 0.98, y: -2 }}
          initial={{ opacity: 0, scale: 0.98, y: -2 }}
          ref={popoverRef}
          style={style ?? undefined}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          <div
            className={
              value.kind === "inlineMath"
                ? "mb-1.5 flex items-center justify-between gap-3"
                : "mb-2 flex items-center justify-between gap-3"
            }
          >
            <div>
              <p className="font-medium text-popover-foreground text-sm">
                {value.kind === "blockMath" ? "Block equation" : "Inline math"}
              </p>
            </div>
            <div className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {value.kind === "blockMath" ? "$$...$$" : "$...$"}
            </div>
          </div>

          {value.kind === "inlineMath" ? (
            <InlineMathInput
              onCancel={onCancel}
              onChange={onChange}
              onSave={onSave}
              value={value.draft}
            />
          ) : (
            <HighlightedTextarea
              onChange={onChange}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  onSave();
                  return;
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  onCancel();
                  return;
                }

                if (event.key === "Tab") {
                  event.preventDefault();
                  const textarea = event.currentTarget;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const nextValue = `${value.draft.slice(0, start)}  ${value.draft.slice(end)}`;

                  onChange(nextValue);

                  requestAnimationFrame(() => {
                    textarea.selectionStart = start + 2;
                    textarea.selectionEnd = start + 2;
                  });
                }
              }}
              value={value.draft}
            />
          )}

          <div
            className={
              value.kind === "inlineMath"
                ? "mt-1.5 flex items-center justify-between gap-2"
                : "mt-2 flex items-center justify-between gap-2"
            }
          >
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
            <div className="flex items-center gap-2">
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
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
