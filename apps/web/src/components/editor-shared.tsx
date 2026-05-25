"use client";

export { CodeBlockOverlayControls } from "@/components/editor/editor-code-block-overlay-controls";
export {
  SlashMenu,
  WikiMenu,
} from "@/components/editor/editor-command-overlays";
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
export { ImagePopover } from "@/components/editor/editor-image-popover";
export { MathPopover } from "@/components/editor/editor-math-popover";
export { MermaidPopover } from "@/components/editor/editor-mermaid-popover";
export { SelectionBubbleMenu } from "@/components/editor/editor-selection-bubble-menu";
export { EditorTableOfContentsRail } from "@/components/editor/editor-table-of-contents-rail";
