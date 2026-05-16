"use client";

import type { TableOfContentDataItem } from "@tiptap/extension-table-of-contents";
import type { Editor } from "@tiptap/react";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import type {
  AiAction,
  ImagePopoverState,
  MathPopoverState,
  MermaidPopoverState,
} from "@/components/editor/editor-core";
import {
  getImagePickerTab,
  loadRecentTemplateIds,
  loadWorkspaceNoteTemplates,
} from "@/components/editor/editor-core";
import {
  getDefaultNoteTemplates,
  type NoteTemplate,
} from "@/lib/note-templates";
import {
  NOTE_WIDGET_INSERT_EVENT,
  type NoteWidgetPayload,
} from "@/lib/note-widgets";
import { useUploadThing } from "@/lib/uploadthing";

export function useEditorSupportState({
  workspaceUuid,
}: {
  workspaceUuid: string;
}) {
  const [mathPopover, setMathPopover] = useState<MathPopoverState | null>(null);
  const [mermaidPopover, setMermaidPopover] =
    useState<MermaidPopoverState | null>(null);
  const [imagePopover, setImagePopover] = useState<ImagePopoverState | null>(
    null
  );
  const [imageUploadBusy, setImageUploadBusy] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<AiAction | null>(null);
  const [aiReview, setAiReview] = useState<{
    from: number;
    generatedLength: number;
    original: string;
  } | null>(null);
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);
  const [noteTemplates, setNoteTemplates] = useState<NoteTemplate[]>(() =>
    getDefaultNoteTemplates()
  );
  const [recentTemplateIds, setRecentTemplateIds] = useState<string[]>([]);
  const [tableOfContentsItems, setTableOfContentsItems] = useState<
    TableOfContentDataItem[]
  >([]);
  const { startUpload: startImageUpload } = useUploadThing("imageUploader");

  useEffect(() => {
    setNoteTemplates(loadWorkspaceNoteTemplates(workspaceUuid));
    setRecentTemplateIds(loadRecentTemplateIds(workspaceUuid));
  }, [workspaceUuid]);

  useEffect(() => {
    if (!inlineNotice) {
      return;
    }

    const timer = window.setTimeout(() => setInlineNotice(null), 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [inlineNotice]);

  return {
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
  };
}

export function useEditorSupportSync({
  activePaneId,
  currentPaneId,
  editor,
  imagePopover,
  imageSelection,
  setImagePopover,
  setImageUploadBusy,
  setImageUploadError,
}: {
  activePaneId: string | null;
  currentPaneId: string | null;
  editor: Editor | null;
  imagePopover: ImagePopoverState | null;
  imageSelection: { pos: number; src: string } | null;
  setImagePopover: Dispatch<SetStateAction<ImagePopoverState | null>>;
  setImageUploadBusy: Dispatch<SetStateAction<boolean>>;
  setImageUploadError: Dispatch<SetStateAction<string | null>>;
}) {
  useEffect(() => {
    if (!imageSelection) {
      setImagePopover((current) => (current ? null : current));
      return;
    }

    setImagePopover((current) => {
      if (
        current?.pos === imageSelection.pos &&
        current?.src === imageSelection.src
      ) {
        return current;
      }
      return {
        ...imageSelection,
        tab: getImagePickerTab(imageSelection.src),
      };
    });
  }, [imageSelection, setImagePopover]);

  useEffect(() => {
    if (imagePopover) {
      setImageUploadError(null);
      return;
    }
    setImageUploadError(null);
    setImageUploadBusy(false);
  }, [imagePopover, setImageUploadBusy, setImageUploadError]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    if (currentPaneId && currentPaneId !== activePaneId) {
      return;
    }

    const handleInsertWidget = (event: Event) => {
      const detail = (event as CustomEvent<NoteWidgetPayload>).detail;
      if (!detail?.html?.trim()) {
        return;
      }

      editor
        .chain()
        .focus()
        .insertNoteWidget({
          html: detail.html,
          title: detail.title ?? null,
        })
        .run();
    };

    window.addEventListener(NOTE_WIDGET_INSERT_EVENT, handleInsertWidget);
    return () => {
      window.removeEventListener(NOTE_WIDGET_INSERT_EVENT, handleInsertWidget);
    };
  }, [activePaneId, currentPaneId, editor]);
}
