"use client";

import {
  ArrowsOutLineHorizontal as BetweenHorizontalEnd,
  ArrowsOutLineHorizontal as BetweenHorizontalStart,
  ArrowsOutLineVertical as BetweenVerticalEnd,
  ArrowsOutLineVertical as BetweenVerticalStart,
  Columns as Columns3,
  GitMerge as Merge,
  Rows as Rows3,
  Rows as Split,
  Table as Table2,
  Trash as Trash2,
} from "@phosphor-icons/react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TableAction } from "@/components/editor/editor-core";

export function useEditorTableTools({ editor }: { editor: Editor | null }) {
  const tableState = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) {
        return {
          active: false,
          addRowBefore: false,
          addRowAfter: false,
          addColumnBefore: false,
          addColumnAfter: false,
          deleteRow: false,
          deleteColumn: false,
          toggleHeaderRow: false,
          mergeOrSplit: false,
          splitCell: false,
          deleteTable: false,
        };
      }

      return {
        active: editor.isActive("table"),
        addRowBefore: editor.can().addRowBefore(),
        addRowAfter: editor.can().addRowAfter(),
        addColumnBefore: editor.can().addColumnBefore(),
        addColumnAfter: editor.can().addColumnAfter(),
        deleteRow: editor.can().deleteRow(),
        deleteColumn: editor.can().deleteColumn(),
        toggleHeaderRow: editor.can().toggleHeaderRow(),
        mergeOrSplit: editor.can().mergeOrSplit(),
        splitCell: editor.can().splitCell(),
        deleteTable: editor.can().deleteTable(),
      };
    },
  });

  const [tableContextMenu, setTableContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
  }>({ open: false, x: 0, y: 0 });
  const tableContextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const dom = editor.view.dom;

    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target?.closest(".tableWrapper, table, th, td")) {
        return;
      }

      event.preventDefault();

      const pos = editor.view.posAtCoords({
        left: event.clientX,
        top: event.clientY,
      });

      if (pos?.pos != null) {
        editor.chain().focus().setTextSelection(pos.pos).run();
      }

      setTableContextMenu({ open: true, x: event.clientX, y: event.clientY });
    };

    const closeMenu = () =>
      setTableContextMenu((current) =>
        current.open ? { ...current, open: false } : current
      );
    const handlePointerDown = (event: MouseEvent) => {
      if (
        !tableContextMenuRef.current?.contains(event.target as globalThis.Node)
      ) {
        closeMenu();
      }
    };

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    dom.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", closeMenu, true);
    document.addEventListener("keydown", handleEscape);

    return () => {
      dom.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", closeMenu, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [editor]);

  const tableActions = useMemo<TableAction[]>(() => {
    if (!(editor && tableState)) {
      return [];
    }

    return [
      {
        id: "add-row-before",
        label: "Row before",
        icon: BetweenHorizontalStart,
        disabled: !tableState.addRowBefore,
        run: () => editor.chain().focus().addRowBefore().run(),
      },
      {
        id: "add-row-after",
        label: "Row after",
        icon: BetweenHorizontalEnd,
        disabled: !tableState.addRowAfter,
        run: () => editor.chain().focus().addRowAfter().run(),
      },
      {
        id: "add-column-before",
        label: "Column before",
        icon: BetweenVerticalStart,
        disabled: !tableState.addColumnBefore,
        run: () => editor.chain().focus().addColumnBefore().run(),
      },
      {
        id: "add-column-after",
        label: "Column after",
        icon: BetweenVerticalEnd,
        disabled: !tableState.addColumnAfter,
        run: () => editor.chain().focus().addColumnAfter().run(),
      },
      {
        id: "delete-row",
        label: "Delete row",
        icon: Rows3,
        disabled: !tableState.deleteRow,
        run: () => editor.chain().focus().deleteRow().run(),
      },
      {
        id: "delete-column",
        label: "Delete column",
        icon: Columns3,
        disabled: !tableState.deleteColumn,
        run: () => editor.chain().focus().deleteColumn().run(),
      },
      {
        id: "toggle-header-row",
        label: "Header row",
        icon: Table2,
        disabled: !tableState.toggleHeaderRow,
        run: () => editor.chain().focus().toggleHeaderRow().run(),
      },
      {
        id: "merge-or-split",
        label: "Merge / split",
        icon: Merge,
        disabled: !tableState.mergeOrSplit,
        run: () => editor.chain().focus().mergeOrSplit().run(),
      },
      {
        id: "split-cell",
        label: "Split cell",
        icon: Split,
        disabled: !tableState.splitCell,
        run: () => editor.chain().focus().splitCell().run(),
      },
      {
        id: "delete-table",
        label: "Delete table",
        icon: Trash2,
        disabled: !tableState.deleteTable,
        run: () => editor.chain().focus().deleteTable().run(),
      },
    ];
  }, [editor, tableState]);

  return {
    tableActions,
    tableContextMenu,
    tableContextMenuRef,
    tableState,
    setTableContextMenu,
  };
}
