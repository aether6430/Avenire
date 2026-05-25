"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avenire/ui/components/select";
import { Copy } from "@phosphor-icons/react/Copy";
import type { Editor } from "@tiptap/react";
import { common } from "lowlight";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { VIEWPORT_PADDING } from "./editor-core";

export function CodeBlockOverlayControls({
  editor,
  onCopy,
}: {
  editor: Editor;
  onCopy: (pos: number) => void;
}) {
  const languages = useMemo(
    () => [
      "plaintext",
      ...Object.keys(common).sort((a, b) => a.localeCompare(b)),
    ],
    []
  );
  const [blocks, setBlocks] = useState<
    Array<{
      language: string;
      pos: number;
      rect: DOMRect;
    }>
  >([]);
  const [hoveredBlockPos, setHoveredBlockPos] = useState<number | null>(null);
  const [activeBlockPos, setActiveBlockPos] = useState<number | null>(null);

  useEffect(() => {
    const updateBlocks = () => {
      const next: Array<{ language: string; pos: number; rect: DOMRect }> = [];

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name !== "codeBlock") {
          return;
        }

        const dom = editor.view.nodeDOM(pos);
        if (!(dom instanceof HTMLElement)) {
          return;
        }

        const rect = dom.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          return;
        }

        next.push({
          language:
            ((node.attrs.language as string | null | undefined) ??
              "plaintext") ||
            "plaintext",
          pos,
          rect,
        });
      });

      setBlocks(next);
    };

    updateBlocks();
    editor.on("transaction", updateBlocks);
    window.addEventListener("resize", updateBlocks);
    window.addEventListener("scroll", updateBlocks, true);

    return () => {
      editor.off("transaction", updateBlocks);
      window.removeEventListener("resize", updateBlocks);
      window.removeEventListener("scroll", updateBlocks, true);
    };
  }, [editor]);

  useEffect(() => {
    const updateActiveBlock = () => {
      const { from } = editor.state.selection;
      let nextActive: number | null = null;

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name !== "codeBlock") {
          return;
        }

        if (from >= pos && from <= pos + node.nodeSize) {
          nextActive = pos;
        }
      });

      setActiveBlockPos(nextActive);
    };

    updateActiveBlock();
    editor.on("selectionUpdate", updateActiveBlock);
    editor.on("transaction", updateActiveBlock);

    return () => {
      editor.off("selectionUpdate", updateActiveBlock);
      editor.off("transaction", updateActiveBlock);
    };
  }, [editor]);

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    blocks.forEach((block) => {
      const dom = editor.view.nodeDOM(block.pos);
      if (!(dom instanceof HTMLElement)) {
        return;
      }

      const handleEnter = () => setHoveredBlockPos(block.pos);
      const handleLeave = () =>
        setHoveredBlockPos((current) =>
          current === block.pos ? null : current
        );

      dom.addEventListener("pointerenter", handleEnter);
      dom.addEventListener("pointerleave", handleLeave);
      cleanups.push(() => {
        dom.removeEventListener("pointerenter", handleEnter);
        dom.removeEventListener("pointerleave", handleLeave);
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [blocks, editor]);

  return (
    <AnimatePresence>
      {blocks
        .filter(
          (block) =>
            block.pos === activeBlockPos || block.pos === hoveredBlockPos
        )
        .map((block) => (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="fixed z-[82]"
            exit={{ opacity: 0, scale: 0.98, y: -2 }}
            initial={{ opacity: 0, scale: 0.98, y: -2 }}
            key={block.pos}
            style={{
              left: Math.max(VIEWPORT_PADDING, block.rect.right - 176),
              top: block.rect.top + 8,
            }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <div
              className="flex items-center gap-1 rounded-md border border-border bg-popover/96 p-1 shadow-md backdrop-blur"
              data-slot="editor-floating-popover"
            >
              <Select
                onValueChange={(value) => {
                  editor
                    .chain()
                    .focus()
                    .setTextSelection(block.pos + 1)
                    .updateAttributes("codeBlock", {
                      language: value === "plaintext" ? null : value,
                    })
                    .run();
                }}
                value={block.language}
              >
                <SelectTrigger className="h-7 min-w-28 border-border bg-background px-2 text-xs">
                  <SelectValue placeholder="plaintext" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((language) => (
                    <SelectItem key={language} value={language}>
                      {language}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => onCopy(block.pos)}
                size="sm"
                type="button"
                variant="outline"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
          </motion.div>
        ))}
    </AnimatePresence>
  );
}
