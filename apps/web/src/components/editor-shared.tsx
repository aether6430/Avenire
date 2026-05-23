"use client";

export type {
  AiAction,
  AvenireEditorProps,
  ImagePickerTab,
  ImagePopoverState,
  MathKind,
  MathPopoverState,
  MermaidPopoverState,
  SlashCommand,
  SlashMatch,
  TableAction,
  WikiOpenOptions,
  WikiPage,
} from "@/components/editor/editor-core";

export {
  clamp,
  clearSlashText,
  getActiveCodeBlockNode,
  getEventTargetElement,
  getImagePickerTab,
  getScrollTarget,
  getSlashMatch,
  getWikiMatch,
  getWorkspaceFileIdFromHref,
  insertMarkdownContent,
  insertWikiLink,
  MENU_OFFSET,
  MERMAID_DEFAULT,
  normalizeWikiSyntax,
  VIEWPORT_PADDING,
} from "@/components/editor/editor-core";

export {
  BlockMathExtension,
  InlineMathExtension,
  MermaidDiagramExtension,
  PasteMarkdownExtension,
  ScribeCodeBlockLowlight,
  TaskListSortExtension,
} from "@/components/editor/editor-extensions";

export {
  CodeBlockOverlayControls,
  EditorTableOfContentsRail,
  SelectionBubbleMenu,
  SlashMenu,
  WikiMenu,
} from "@/components/editor/editor-overlays";

export {
  ImagePopover,
  MathPopover,
  MermaidPopover,
} from "@/components/editor/editor-popovers";
