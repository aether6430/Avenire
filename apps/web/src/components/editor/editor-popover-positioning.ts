"use client";

import type { Editor } from "@tiptap/react";
import type { RefObject } from "react";
import { useEffect, useState } from "react";
import {
  clamp,
  MENU_OFFSET,
  VIEWPORT_PADDING,
} from "@/components/editor/editor-core";

function getEditorAnchorRect(editor: Editor, pos: number) {
  const nodeDom = editor.view.nodeDOM(pos);

  if (nodeDom instanceof HTMLElement) {
    return nodeDom.getBoundingClientRect();
  }

  const coords = editor.view.coordsAtPos(pos);

  return new DOMRect(
    coords.left,
    coords.top,
    1,
    Math.max(coords.bottom - coords.top, 1)
  );
}

export function useAnchoredPopoverStyle({
  editor,
  pos,
  popoverRef,
  scrollContainerRef,
}: {
  editor: Editor;
  pos: number | null;
  popoverRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}) {
  const [style, setStyle] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (!(pos !== null && popoverRef.current)) {
      return;
    }

    const updatePosition = () => {
      if (!popoverRef.current) {
        return;
      }
      const anchorRect = getEditorAnchorRect(editor, pos);
      const popoverRect = popoverRef.current.getBoundingClientRect();
      const left = clamp(
        anchorRect.left,
        VIEWPORT_PADDING,
        window.innerWidth - popoverRect.width - VIEWPORT_PADDING
      );
      const canPlaceBelow =
        anchorRect.bottom + MENU_OFFSET + popoverRect.height <
        window.innerHeight - VIEWPORT_PADDING;
      const top = canPlaceBelow
        ? anchorRect.bottom + MENU_OFFSET
        : Math.max(
            VIEWPORT_PADDING,
            anchorRect.top - popoverRect.height - MENU_OFFSET
          );

      setStyle({ left, top });
    };

    updatePosition();

    const scrollTarget = scrollContainerRef.current;
    window.addEventListener("resize", updatePosition);
    scrollTarget?.addEventListener("scroll", updatePosition, { passive: true });

    return () => {
      window.removeEventListener("resize", updatePosition);
      scrollTarget?.removeEventListener("scroll", updatePosition);
    };
  }, [editor, popoverRef, pos, scrollContainerRef]);

  return style;
}

export function usePopoverOutsideDismiss({
  enabled,
  popoverRef,
  onCancel,
  shouldIgnoreTarget,
}: {
  enabled: boolean;
  popoverRef: RefObject<HTMLDivElement | null>;
  onCancel: () => void;
  shouldIgnoreTarget: (target: HTMLElement) => boolean;
}) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target) {
        return;
      }
      if (popoverRef.current?.contains(target)) {
        return;
      }
      if (shouldIgnoreTarget(target)) {
        return;
      }

      onCancel();
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [enabled, onCancel, popoverRef, shouldIgnoreTarget]);
}
