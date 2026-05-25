"use client";

import { FloatingMenu } from "@tiptap/react/menus";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import {
  clearSlashText,
  getScrollTarget,
  getSlashMatch,
  getWikiMatch,
  insertWikiLink,
  VIEWPORT_PADDING,
} from "@/components/editor/editor-core";
import type { AvenireEditorRuntime } from "@/components/use-avenire-editor";

const SelectionBubbleMenu = dynamic(
  () =>
    import("@/components/editor/editor-selection-bubble-menu").then(
      (module) => module.SelectionBubbleMenu
    ),
  { loading: () => null, ssr: false }
);

const SlashMenu = dynamic(
  () =>
    import("@/components/editor/editor-command-overlays").then(
      (module) => module.SlashMenu
    ),
  { loading: () => null, ssr: false }
);

const WikiMenu = dynamic(
  () =>
    import("@/components/editor/editor-command-overlays").then(
      (module) => module.WikiMenu
    ),
  { loading: () => null, ssr: false }
);

const CodeBlockOverlayControls = dynamic(
  () =>
    import("@/components/editor/editor-code-block-overlay-controls").then(
      (module) => module.CodeBlockOverlayControls
    ),
  { loading: () => null, ssr: false }
);

export function EditorFloatingLayer({
  runtime,
}: {
  runtime: AvenireEditorRuntime;
}) {
  const {
    activeSlashIndex,
    activeWikiIndex,
    editor,
    filteredSlashCommands,
    filteredWikiPages,
    scrollContainerRef,
    setInlineNotice,
    setSlashNav,
    setWikiNav,
    visibleSlashMatch,
    visibleWikiMatch,
    wikiPages,
  } = runtime;

  if (!editor) {
    return null;
  }

  const executeSlashCommand = (index: number) => {
    const match = getSlashMatch(editor);
    const command = filteredSlashCommands[index];

    if (!command) {
      return;
    }

    if (command.clearTrigger ?? true) {
      clearSlashText(editor, match);
    }
    void command.run({ match });
    setSlashNav({ key: null, index: 0 });
  };

  return (
    <>
      <SelectionBubbleMenu
        editor={editor}
        scrollContainerRef={scrollContainerRef}
      />

      <FloatingMenu
        appendTo={() => document.body}
        className="z-[80]"
        editor={editor}
        options={{
          strategy: "fixed",
          placement: "bottom-start",
          offset: 10,
          onUpdate: () => editor.commands.updateFloatingMenuPosition(),
          flip: { padding: VIEWPORT_PADDING },
          shift: { padding: VIEWPORT_PADDING },
          scrollTarget: getScrollTarget(scrollContainerRef),
        }}
        pluginKey="wikiFloatingMenu"
        resizeDelay={0}
        shouldShow={({ editor }) =>
          Boolean(editor) && getWikiMatch(editor) !== null
        }
        updateDelay={0}
      >
        <AnimatePresence>
          {visibleWikiMatch ? (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -2 }}
              initial={{ opacity: 0, scale: 0.98, y: -2 }}
              key="wiki-menu"
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              <WikiMenu
                activeIndex={activeWikiIndex}
                onPick={(index) => {
                  const page = filteredWikiPages[index];
                  if (!page) {
                    return;
                  }
                  insertWikiLink(editor, page.title, wikiPages, {
                    from: visibleWikiMatch.from,
                    to: visibleWikiMatch.to,
                  });
                  setWikiNav({ key: null, index: 0 });
                }}
                pages={filteredWikiPages}
                query={visibleWikiMatch.query}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </FloatingMenu>

      <FloatingMenu
        appendTo={() => document.body}
        className="z-[80]"
        editor={editor}
        options={{
          strategy: "fixed",
          placement: "bottom-start",
          offset: 12,
          onUpdate: () => editor.commands.updateFloatingMenuPosition(),
          flip: { padding: VIEWPORT_PADDING },
          shift: { padding: VIEWPORT_PADDING },
          scrollTarget: getScrollTarget(scrollContainerRef),
        }}
        pluginKey="slashFloatingMenu"
        resizeDelay={0}
        shouldShow={({ editor }) =>
          Boolean(editor) && getSlashMatch(editor) !== null
        }
        updateDelay={0}
      >
        <AnimatePresence>
          {visibleSlashMatch ? (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -2 }}
              initial={{ opacity: 0, scale: 0.98, y: -2 }}
              key="slash-menu"
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              <SlashMenu
                activeIndex={activeSlashIndex}
                commands={filteredSlashCommands}
                onPick={executeSlashCommand}
                query={visibleSlashMatch.query}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </FloatingMenu>

      <CodeBlockOverlayControls
        editor={editor}
        onCopy={(pos) => {
          const activeCodeBlock = editor.state.doc.nodeAt(pos);

          if (activeCodeBlock?.type.name !== "codeBlock") {
            setInlineNotice("Could not find that code block.");
            return;
          }

          void navigator.clipboard
            .writeText(activeCodeBlock.textContent)
            .then(() => setInlineNotice("Code copied."))
            .catch(() => setInlineNotice("Could not copy code."));
        }}
      />
    </>
  );
}
