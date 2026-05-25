"use client";

import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  filterSlashCommands,
  filterWikiPages,
  resolveActiveMenuIndex,
} from "@/components/editor/editor-command-menu-model";
import {
  clearSlashText,
  getActiveCodeBlockNode,
  getScrollTarget,
  getSlashMatch,
  getWikiMatch,
  insertWikiLink,
  type MathPopoverState,
  type MermaidPopoverState,
  type SlashCommand,
  type WikiPage,
} from "@/components/editor/editor-core";
import { commandPaletteActions } from "@/stores/commandPaletteStore";

export function useEditorCommandNavigation({
  editor,
  mathPopover,
  mermaidPopover,
  scrollContainerRef,
  setMathPopover,
  setMermaidPopover,
  slashCommands,
  wikiPages,
}: {
  editor: Editor | null;
  mathPopover: MathPopoverState | null;
  mermaidPopover: MermaidPopoverState | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  setMathPopover: Dispatch<SetStateAction<MathPopoverState | null>>;
  setMermaidPopover: Dispatch<SetStateAction<MermaidPopoverState | null>>;
  slashCommands: SlashCommand[];
  wikiPages: WikiPage[];
}) {
  const slashCommandsRef = useRef<SlashCommand[]>([]);
  const wikiPagesRef = useRef<WikiPage[]>([]);
  const activeSlashIndexRef = useRef(0);
  const activeWikiIndexRef = useRef(0);
  const [slashNav, setSlashNav] = useState<{
    key: string | null;
    index: number;
  }>({
    key: null,
    index: 0,
  });
  const [wikiNav, setWikiNav] = useState<{
    key: string | null;
    index: number;
  }>({
    key: null,
    index: 0,
  });

  const slashMatch = useEditorState({
    editor,
    selector: ({ editor }) => (editor ? getSlashMatch(editor) : null),
  });
  const wikiMatch = useEditorState({
    editor,
    selector: ({ editor }) => (editor ? getWikiMatch(editor) : null),
  });

  const visibleSlashMatch = slashMatch ?? null;
  const visibleWikiMatch = wikiMatch ?? null;
  const filteredSlashCommands = filterSlashCommands(
    slashCommands,
    visibleSlashMatch?.query ?? ""
  );
  const filteredWikiPages = filterWikiPages(
    wikiPages,
    visibleWikiMatch?.query ?? ""
  );

  const activeSlashIndex = resolveActiveMenuIndex({
    itemCount: filteredSlashCommands.length,
    matchKey: visibleSlashMatch?.key ?? null,
    navIndex: slashNav.index,
    navKey: slashNav.key,
  });
  const activeWikiIndex = resolveActiveMenuIndex({
    itemCount: filteredWikiPages.length,
    matchKey: visibleWikiMatch?.key ?? null,
    navIndex: wikiNav.index,
    navKey: wikiNav.key,
  });

  slashCommandsRef.current = filteredSlashCommands;
  wikiPagesRef.current = filteredWikiPages;
  activeSlashIndexRef.current = activeSlashIndex;
  activeWikiIndexRef.current = activeWikiIndex;

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (visibleSlashMatch || visibleWikiMatch) {
      const { state, view } = editor;
      view.dispatch(state.tr.setMeta("slashFloatingMenu", "updatePosition"));
      view.dispatch(state.tr.setMeta("wikiFloatingMenu", "updatePosition"));
    }
  }, [editor, visibleSlashMatch, visibleWikiMatch]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        const key = event.key.toLowerCase();
        if (key === "p" && event.shiftKey) {
          event.preventDefault();
          event.stopPropagation();
          commandPaletteActions.open();
          return;
        }
      }

      const match = getSlashMatch(editor);
      const wiki = getWikiMatch(editor);

      if (event.key === "Escape") {
        const selection = editor.state.selection;

        if (mathPopover) {
          event.preventDefault();
          const pos = mathPopover.pos;
          const node = editor.state.doc.nodeAt(pos);
          setMathPopover(null);
          if (node) {
            const after = Math.min(
              pos + node.nodeSize,
              editor.state.doc.content.size
            );
            editor.view.dispatch(
              editor.state.tr.setSelection(
                TextSelection.create(editor.state.doc, after)
              )
            );
          }
          editor.view.focus();
          return;
        }

        if (mermaidPopover) {
          event.preventDefault();
          const pos = mermaidPopover.pos;
          const node = editor.state.doc.nodeAt(pos);
          setMermaidPopover(null);
          if (node) {
            const after = Math.min(
              pos + node.nodeSize,
              editor.state.doc.content.size
            );
            editor.view.dispatch(
              editor.state.tr.setSelection(
                TextSelection.create(editor.state.doc, after)
              )
            );
          }
          editor.view.focus();
          return;
        }

        if (selection instanceof NodeSelection) {
          const nodeName = selection.node.type.name;
          if (nodeName === "blockMath" || nodeName === "mermaidDiagram") {
            event.preventDefault();
            const after = Math.min(
              selection.from + selection.node.nodeSize,
              editor.state.doc.content.size
            );
            editor.view.dispatch(
              editor.state.tr.setSelection(
                TextSelection.create(editor.state.doc, after)
              )
            );
            editor.view.focus();
            return;
          }
        }

        if (editor.isActive("codeBlock")) {
          const active = getActiveCodeBlockNode(editor);
          if (active) {
            event.preventDefault();
            const after = Math.min(
              active.pos + active.node.nodeSize,
              editor.state.doc.content.size
            );
            editor.view.dispatch(
              editor.state.tr.setSelection(
                TextSelection.create(editor.state.doc, after)
              )
            );
            editor.view.focus();
            return;
          }
        }
      }

      if (wiki) {
        const pages = wikiPagesRef.current;
        const currentIndex = activeWikiIndexRef.current;

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setWikiNav((current) => ({
            key: wiki.key,
            index:
              pages.length === 0
                ? 0
                : current.key === wiki.key
                  ? (current.index + 1) % pages.length
                  : 0,
          }));
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setWikiNav((current) => ({
            key: wiki.key,
            index:
              pages.length === 0
                ? 0
                : current.key === wiki.key
                  ? (current.index - 1 + pages.length) % pages.length
                  : Math.max(pages.length - 1, 0),
          }));
          return;
        }

        if (
          (event.key === "Enter" || event.key === "Tab") &&
          pages.length > 0
        ) {
          event.preventDefault();
          const page = pages[currentIndex];
          if (!page) {
            return;
          }
          insertWikiLink(editor, page.title, wikiPages, {
            from: wiki.from,
            to: wiki.to,
          });
          setWikiNav({ key: null, index: 0 });
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          editor
            .chain()
            .focus()
            .deleteRange({ from: wiki.from, to: wiki.to })
            .run();
          setWikiNav({ key: null, index: 0 });
          return;
        }
      }

      if (!match) {
        return;
      }

      const commands = slashCommandsRef.current;
      const currentIndex = activeSlashIndexRef.current;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashNav((current) => ({
          key: match.key,
          index:
            commands.length === 0
              ? 0
              : current.key === match.key
                ? (current.index + 1) % commands.length
                : 0,
        }));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashNav((current) => ({
          key: match.key,
          index:
            commands.length === 0
              ? 0
              : current.key === match.key
                ? (current.index - 1 + commands.length) % commands.length
                : Math.max(commands.length - 1, 0),
        }));
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        clearSlashText(editor, match);
        setSlashNav({ key: null, index: 0 });
        return;
      }

      if (
        (event.key === "Enter" || event.key === "Tab") &&
        commands.length > 0
      ) {
        event.preventDefault();
        const command = commands[currentIndex];
        if (!command) {
          return;
        }
        if (command.clearTrigger ?? true) {
          clearSlashText(editor, match);
        }
        void command.run({ match });
        setSlashNav({ key: null, index: 0 });
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener("keydown", handleKeyDown, true);

    return () => {
      dom.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    editor,
    mathPopover,
    mermaidPopover,
    setMathPopover,
    setMermaidPopover,
    wikiPages,
  ]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const scrollTarget = getScrollTarget(scrollContainerRef);
    let frame = 0;

    const updateMenus = () => {
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const { state, view } = editor;
        view.dispatch(state.tr.setMeta("slashFloatingMenu", "updatePosition"));
        view.dispatch(state.tr.setMeta("wikiFloatingMenu", "updatePosition"));
        view.dispatch(
          state.tr.setMeta("formattingBubbleMenu", "updatePosition")
        );
      });
    };

    scrollTarget.addEventListener("scroll", updateMenus, { passive: true });
    window.addEventListener("resize", updateMenus);

    return () => {
      scrollTarget.removeEventListener("scroll", updateMenus);
      window.removeEventListener("resize", updateMenus);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [editor, scrollContainerRef]);

  return {
    activeSlashIndex,
    activeWikiIndex,
    filteredSlashCommands,
    filteredWikiPages,
    setSlashNav,
    setWikiNav,
    visibleSlashMatch,
    visibleWikiMatch,
  };
}
