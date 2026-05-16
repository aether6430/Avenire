"use client";

import { NodeSelection } from "@tiptap/pm/state";
import { type Editor, useEditor, useEditorState } from "@tiptap/react";
import { useCallback, useMemo, useRef } from "react";
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
import { isMarkdownNoteTemplateTargetEmpty } from "@/lib/markdown-note-template";
import { resolveWorkspaceFileRoute } from "@/lib/workspace-file-navigation";
import {
  useOptionalCurrentWorkspacePane,
  useWorkspacePaneNavigation,
} from "@/lib/workspace-panes";
import { useWorkspacePaneStore } from "@/stores/workspacePaneStore";

export function useAvenireEditor({
  createdBy,
  defaultValue,
  noteTitle,
  onChange,
  onPagePropertiesChange,
  onPropertyDefinitionsChange,
  onTemplateApplied,
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
    noteTemplates,
    recentTemplateIds,
    setAiLoading,
    setAiReview,
    setImagePopover,
    setImageUploadBusy,
    setImageUploadError,
    setInlineNotice,
    setMathPopover,
    setMermaidPopover,
    setRecentTemplateIds,
    setTableOfContentsItems,
    startImageUpload,
    tableOfContentsItems,
  } = useEditorSupportState({
    workspaceUuid,
  });

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
          imageSelection: null,
          showEmptyTemplateActions: false,
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
        imageSelection,
        showEmptyTemplateActions: isMarkdownNoteTemplateTargetEmpty(
          editor.getMarkdown(),
          noteTitle
        ),
      };
    },
  });

  const resolvedEditorUiState = editorUiState ?? {
    imageSelection: null,
    showEmptyTemplateActions: false,
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

  return {
    activePaneId,
    activeSlashIndex,
    activeWikiIndex,
    aiReview,
    createdBy,
    editor,
    filteredSlashCommands,
    filteredWikiPages,
    imagePopover,
    imageUploadBusy,
    imageUploadError,
    inlineNotice,
    mathPopover,
    mermaidPopover,
    noteTemplates,
    noteTitle,
    onPagePropertiesChange,
    onPropertyDefinitionsChange,
    onTemplateApplied,
    pageProperties,
    propertyDefinitions,
    readOnly,
    recentTemplateIds,
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
    setRecentTemplateIds,
    setSlashNav,
    setTableContextMenu,
    setWikiNav,
    startImageUpload,
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
