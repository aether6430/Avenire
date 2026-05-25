"use client";

import type { Editor } from "@tiptap/react";
import { type Dispatch, type SetStateAction, useMemo } from "react";
import { createSlashCommands } from "@/components/editor/editor-command-menu-model";
import type {
  AiAction,
  ImagePopoverState,
  MathKind,
  MermaidPopoverState,
} from "@/components/editor/editor-core";

export function useEditorCommandActions({
  aiLoading,
  editor,
  openMathEditor,
  setAiLoading,
  setAiReview,
  setImagePopover,
  setInlineNotice,
  setMermaidPopover,
}: {
  aiLoading: AiAction | null;
  editor: Editor | null;
  openMathEditor: (editor: Editor, kind: MathKind, pos: number) => void;
  setAiLoading: Dispatch<SetStateAction<AiAction | null>>;
  setAiReview: Dispatch<
    SetStateAction<{
      from: number;
      generatedLength: number;
      original: string;
    } | null>
  >;
  setImagePopover: Dispatch<SetStateAction<ImagePopoverState | null>>;
  setInlineNotice: Dispatch<SetStateAction<string | null>>;
  setMermaidPopover: Dispatch<SetStateAction<MermaidPopoverState | null>>;
}) {
  const slashCommands = useMemo(() => {
    if (!editor) {
      return [];
    }

    return createSlashCommands({
      aiLoading,
      editor,
      openMathEditor,
      setAiLoading,
      setAiReview,
      setImagePopover,
      setInlineNotice,
      setMermaidPopover,
    });
  }, [
    aiLoading,
    editor,
    openMathEditor,
    setAiLoading,
    setAiReview,
    setImagePopover,
    setInlineNotice,
    setMermaidPopover,
  ]);

  return { slashCommands };
}
