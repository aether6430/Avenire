"use client";

import type { Editor } from "@tiptap/react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type {
  AiAction,
  ImagePopoverState,
  MathKind,
  MathPopoverState,
  MermaidPopoverState,
  WikiPage,
} from "@/components/editor/editor-core";
import { useEditorCommandActions } from "@/components/editor/use-editor-command-actions";
import { useEditorCommandNavigation } from "@/components/editor/use-editor-command-navigation";

export function useEditorCommandMenus({
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
}: {
  aiLoading: AiAction | null;
  editor: Editor | null;
  mathPopover: MathPopoverState | null;
  mermaidPopover: MermaidPopoverState | null;
  openMathEditor: (editor: Editor, kind: MathKind, pos: number) => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
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
  setMathPopover: Dispatch<SetStateAction<MathPopoverState | null>>;
  setMermaidPopover: Dispatch<SetStateAction<MermaidPopoverState | null>>;
  wikiPages: WikiPage[];
}) {
  const { slashCommands } = useEditorCommandActions({
    aiLoading,
    editor,
    openMathEditor,
    setAiLoading,
    setAiReview,
    setImagePopover,
    setInlineNotice,
    setMermaidPopover,
  });

  const navigation = useEditorCommandNavigation({
    editor,
    mathPopover,
    mermaidPopover,
    scrollContainerRef,
    setMathPopover,
    setMermaidPopover,
    slashCommands,
    wikiPages,
  });

  return navigation;
}
