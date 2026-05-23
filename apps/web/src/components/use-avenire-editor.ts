"use client";

import { NodeSelection } from "@tiptap/pm/state";
import { type Editor, useEditor, useEditorState } from "@tiptap/react";
import { useCallback, useMemo, useRef } from "react";
import { readAiRouteTextResponse } from "@/components/editor/editor-ai-response";
import {
  type AvenireEditorProps,
  type MathKind,
  normalizeWikiSyntax,
  type WikiOpenOptions,
  type WikiPage,
} from "@/components/editor/editor-core";
import { createAvenireEditorConfig } from "@/components/editor/editor-instance";
import { useEditorCommandMenus } from "@/components/editor/use-editor-command-menus";
import {
  useEditorSupportState,
  useEditorSupportSync,
} from "@/components/editor/use-editor-support-state";
import { useEditorTableTools } from "@/components/editor/use-editor-table-tools";
import { resolveWorkspaceFileRoute } from "@/lib/workspace-file-navigation";
import {
  useOptionalCurrentWorkspacePane,
  useWorkspacePaneNavigation,
} from "@/lib/workspace-panes";
import { useWorkspacePaneStore } from "@/stores/workspacePaneStore";

interface DocumentStats {
  characters: number;
  paragraphs: number;
  words: number;
}

function getDocumentStats(editor: Editor | null): DocumentStats {
  if (!editor) {
    return { characters: 0, paragraphs: 0, words: 0 };
  }

  const text = editor.getText();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  let paragraphs = 0;

  editor.state.doc.descendants((node) => {
    if (
      node.type.name === "paragraph" ||
      node.type.name === "heading" ||
      node.type.name === "listItem"
    ) {
      paragraphs += 1;
    }
  });

  return {
    characters: text.length,
    paragraphs,
    words,
  };
}

export function useAvenireEditor({
  createdBy: _createdBy,
  defaultValue,
  noteTitle,
  onChange,
  onPagePropertiesChange,
  onPropertyDefinitionsChange,
  pageProperties = {},
  propertyDefinitions = [],
  readOnly = false,
  scrollContainerRef,
  wikiPages,
  onOpenWikiLink,
  saveState,
  saveMessage,
  workspaceUuid,
}: AvenireEditorProps) {
  const paneNavigation = useWorkspacePaneNavigation();
  const currentPane = useOptionalCurrentWorkspacePane();
  const activePaneId = useWorkspacePaneStore((state) => state.activePaneId);
  const currentPaneId = currentPane?.paneId ?? null;
  const allWikiPagesRef = useRef<WikiPage[]>(wikiPages);

  const resolveWikiPageFromHref = useCallback(
    (href: string | null) => {
      if (!href) {
        return null;
      }
      const pageId = href.startsWith("wiki:")
        ? href.slice(5).toLowerCase()
        : href.startsWith("workspace-file://")
          ? href.slice("workspace-file://".length).toLowerCase()
          : href.startsWith("/wiki/")
            ? href.slice(6).toLowerCase()
            : "";

      if (!pageId) {
        return null;
      }
      return (
        wikiPages.find((entry) => entry.id.toLowerCase() === pageId) ?? null
      );
    },
    [wikiPages]
  );

  const openWorkspaceFileIdentifier = useCallback(
    (fileIdentifier: string, options: WikiOpenOptions) => {
      void resolveWorkspaceFileRoute(workspaceUuid, fileIdentifier).then(
        (route) => {
          if (!route) {
            return;
          }
          paneNavigation.navigate(route, {
            openInNewPane: options.openInNewPane,
          });
        }
      );
    },
    [paneNavigation, workspaceUuid]
  );

  const openWikiPage = useCallback(
    (page: WikiPage, options: WikiOpenOptions = { openInNewPane: false }) => {
      if (onOpenWikiLink) {
        onOpenWikiLink(page, options);
        return;
      }

      openWorkspaceFileIdentifier(page.id, options);
    },
    [onOpenWikiLink, openWorkspaceFileIdentifier]
  );

  const normalizedDefaultValue = useMemo(
    () => normalizeWikiSyntax(defaultValue, wikiPages),
    [defaultValue, wikiPages]
  );

  allWikiPagesRef.current = wikiPages;

  const {
    aiLoading,
    aiReview,
    imagePopover,
    imageUploadBusy,
    imageUploadError,
    inlineNotice,
    mathPopover,
    mermaidPopover,
    setAiLoading,
    setAiReview,
    setImagePopover,
    setImageUploadBusy,
    setImageUploadError,
    setInlineNotice,
    setMathPopover,
    setMermaidPopover,
    setTableOfContentsItems,
    startImageUpload,
    tableOfContentsItems,
  } = useEditorSupportState();

  const openMathEditor = useCallback(
    (editor: Editor, kind: MathKind, pos: number) => {
      const node = editor.state.doc.nodeAt(pos);

      if (!node) {
        return;
      }

      setMathPopover({
        kind,
        pos,
        draft: String(node.attrs.latex ?? ""),
      });
    },
    [setMathPopover]
  );

  const editor = useEditor({
    ...createAvenireEditorConfig({
      allWikiPagesRef,
      normalizedDefaultValue,
      noteTitle,
      onChange,
      openWikiPage,
      openWorkspaceFileIdentifier,
      resolveWikiPageFromHref,
      scrollContainerRef,
      setImagePopover,
      setMathPopover,
      setMermaidPopover,
      setTableOfContentsItems,
    }),
  });

  const editorUiState = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) {
        return {
          documentStats: { characters: 0, paragraphs: 0, words: 0 },
          imageSelection: null,
        };
      }

      const selection = editor.state.selection;
      const imageSelection =
        selection instanceof NodeSelection &&
        selection.node.type.name === "image"
          ? {
              pos: selection.from,
              src: String(selection.node.attrs.src ?? ""),
            }
          : null;

      return {
        documentStats: getDocumentStats(editor),
        imageSelection,
      };
    },
  });

  const resolvedEditorUiState = editorUiState ?? {
    documentStats: { characters: 0, paragraphs: 0, words: 0 },
    imageSelection: null,
  };

  useEditorSupportSync({
    activePaneId,
    currentPaneId,
    editor,
    imagePopover,
    imageSelection: resolvedEditorUiState.imageSelection,
    setImagePopover,
    setImageUploadBusy,
    setImageUploadError,
  });

  const {
    activeSlashIndex,
    activeWikiIndex,
    filteredSlashCommands,
    filteredWikiPages,
    setSlashNav,
    setWikiNav,
    visibleSlashMatch,
    visibleWikiMatch,
  } = useEditorCommandMenus({
    aiLoading,
    editor,
    mathPopover,
    mermaidPopover,
    openMathEditor,
    scrollContainerRef,
    setAiLoading,
    setAiReview,
    setImagePopover,
    setInlineNotice,
    setMathPopover,
    setMermaidPopover,
    wikiPages,
  });

  const {
    tableActions,
    tableContextMenu,
    tableContextMenuRef,
    tableState,
    setTableContextMenu,
  } = useEditorTableTools({ editor });

  const summarizeCurrentPage = useCallback(async () => {
    const markdown = editor?.getMarkdown().trim() ?? "";
    if (!markdown) {
      setInlineNotice("There is no page content to summarize yet.");
      return null;
    }

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "summarize", text: markdown }),
      });

      return await readAiRouteTextResponse(response);
    } catch (error) {
      setInlineNotice(
        error instanceof Error
          ? error.message
          : "Could not summarize this page right now."
      );
      return null;
    }
  }, [editor, setInlineNotice]);

  return {
    activePaneId,
    activeSlashIndex,
    activeWikiIndex,
    aiReview,
    documentStats: resolvedEditorUiState.documentStats,
    editor,
    filteredSlashCommands,
    filteredWikiPages,
    imagePopover,
    imageUploadBusy,
    imageUploadError,
    inlineNotice,
    mathPopover,
    mermaidPopover,
    noteTitle,
    onPagePropertiesChange,
    onPropertyDefinitionsChange,
    pageProperties,
    propertyDefinitions,
    readOnly,
    resolvedEditorUiState,
    saveMessage,
    saveState,
    scrollContainerRef,
    setAiReview,
    setImagePopover,
    setImageUploadBusy,
    setImageUploadError,
    setInlineNotice,
    setMathPopover,
    setMermaidPopover,
    setSlashNav,
    setTableContextMenu,
    setWikiNav,
    startImageUpload,
    summarizeCurrentPage,
    tableActions,
    tableContextMenu,
    tableContextMenuRef,
    tableOfContentsItems,
    tableState,
    visibleSlashMatch,
    visibleWikiMatch,
    wikiPages,
    workspaceUuid,
  };
}

export type AvenireEditorRuntime = ReturnType<typeof useAvenireEditor>;
