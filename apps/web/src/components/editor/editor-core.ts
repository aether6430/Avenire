"use client";

import type { Editor } from "@tiptap/react";
import type { ComponentType, RefObject, SVGProps } from "react";
import type {
  FrontmatterProperties,
  WorkspacePropertyDefinition,
} from "@/lib/frontmatter";

export const MENU_OFFSET = 10;
export const VIEWPORT_PADDING = 12;
export const INLINE_MATH_INPUT_REGEX = /(^|[^$])\$([^$\n]+)\$$/;
export const BLOCK_MATH_INPUT_REGEX = /^\$\$([\s\S]+)\$\$$/;
const MARKDOWN_PASTE_HEURISTICS = [
  /^#{1,6}\s+\S/m,
  /^>\s+\S/m,
  /^[-*+]\s+\S/m,
  /^\d+\.\s+\S/m,
  /^---\s*$/m,
  /```[\s\S]*```/m,
  /\[[^\]]+\]\([^)]+\)/,
  /!\[[^\]]*\]\([^)]+\)/,
  /\|.+\|\n\|(?:\s*:?-+:?\s*\|)+/m,
  /(^|\s)(?:\*\*|__)[^\s].*(?:\*\*|__)($|\s)/m,
  /(^|\s)(?:\*|_)[^\s].*(?:\*|_)($|\s)/m,
] as const;
const WIKI_LINK_REGEX = /\[\[([^[\]]+)\]\]/g;
const WORKSPACE_FILE_LINK_REGEX = /^workspace-file:\/\/(.+)$/i;

export type ImagePickerTab = "upload" | "link";
export type MathKind = "inlineMath" | "blockMath";
export type AiAction =
  | "elaborate"
  | "explain"
  | "improve"
  | "proofread"
  | "simplify";

export interface SlashMatch {
  from: number;
  key: string;
  query: string;
  text: string;
  to: number;
}

export interface MathPopoverState {
  draft: string;
  kind: MathKind;
  pos: number;
}

export interface MermaidPopoverState {
  draft: string;
  pos: number;
}

export interface WikiOpenOptions {
  openInNewPane: boolean;
}

export interface WikiPage {
  content: string;
  excerpt: string;
  id: string;
  title: string;
}

export interface SlashCommand {
  clearTrigger?: boolean;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  id: string;
  keywords: string[];
  label: string;
  run: (context: {
    match: SlashMatch | null;
  }) => void | boolean | Promise<void>;
}

export interface TableAction {
  disabled: boolean;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  id: string;
  label: string;
  run: () => void;
}

export interface ImagePopoverState {
  pos: number;
  src: string;
  tab: ImagePickerTab;
}

export interface AvenireEditorProps {
  createdBy?: string;
  defaultValue: string;
  noteTitle: string;
  onChange: (markdown: string) => void;
  onOpenWikiLink?: (page: WikiPage, options: WikiOpenOptions) => void;
  onPagePropertiesChange?: (properties: FrontmatterProperties) => void;
  onPropertyDefinitionsChange?: (
    definitions: WorkspacePropertyDefinition[]
  ) => void;
  pageProperties?: FrontmatterProperties;
  propertyDefinitions?: WorkspacePropertyDefinition[];
  readOnly?: boolean;
  saveMessage?: string;
  saveState?: "idle" | "saving" | "saved" | "error";
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  wikiPages: WikiPage[];
  workspaceUuid: string;
}

export const MERMAID_DEFAULT = `graph LR
  A[Start] --> B[End]`;

export function getImagePickerTab(src: string): ImagePickerTab {
  return src.trim() ? "link" : "upload";
}

export function looksLikeMarkdown(text: string) {
  const normalized = text.trim();
  if (!normalized) {
    return false;
  }

  return MARKDOWN_PASTE_HEURISTICS.some((pattern) => pattern.test(normalized));
}

export function insertMarkdownContent(editor: Editor, markdown: string) {
  if (!editor.markdown) {
    editor.commands.setContent(markdown);
    return;
  }

  const json = editor.markdown.parse(markdown);
  editor.commands.setContent(json);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getSlashMatch(editor: Editor): SlashMatch | null {
  const { selection } = editor.state;

  if (!selection.empty) {
    return null;
  }

  const { $from } = selection;

  if (!$from.parent.isTextblock) {
    return null;
  }

  const text = $from.parent.textContent.slice(0, $from.parentOffset);
  const slashStart = text.lastIndexOf("/");

  if (slashStart < 0) {
    return null;
  }
  if (slashStart > 0 && !/\s/.test(text[slashStart - 1])) {
    return null;
  }

  const typed = text.slice(slashStart + 1);

  if (/\s/.test(typed)) {
    return null;
  }

  const from = $from.start() + slashStart;

  return {
    query: typed.trim().toLowerCase(),
    from,
    to: from + typed.length + 1,
    text: `/${typed}`,
    key: `${from}:${typed}`,
  };
}

export function getWikiMatch(editor: Editor): SlashMatch | null {
  const { selection } = editor.state;

  if (!selection.empty) {
    return null;
  }

  const { $from } = selection;

  if (!$from.parent.isTextblock) {
    return null;
  }

  const text = $from.parent.textContent.slice(0, $from.parentOffset);
  const openIndex = text.lastIndexOf("[[");

  if (openIndex < 0) {
    return null;
  }
  if (text.slice(openIndex).includes("]]")) {
    return null;
  }

  const query = text.slice(openIndex + 2);
  const from = $from.start() + openIndex;

  return {
    query: query.trim().toLowerCase(),
    from,
    to: $from.start() + $from.parentOffset,
    text: text.slice(openIndex),
    key: `${from}:${query}`,
  };
}

function slugifyWikiTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getWikiHref(title: string, pages: WikiPage[]) {
  const normalized = title.trim().toLowerCase();
  const page = pages.find((entry) => entry.title.toLowerCase() === normalized);
  if (page?.id) {
    return `workspace-file://${page.id}`;
  }

  return `wiki:${slugifyWikiTitle(title)}`;
}

export function getWorkspaceFileIdFromHref(href: string | null) {
  if (!href) {
    return null;
  }

  const match = href.match(WORKSPACE_FILE_LINK_REGEX);
  if (!match) {
    return null;
  }

  const identifier = match[1]?.trim();
  if (!identifier) {
    return null;
  }

  try {
    return decodeURIComponent(identifier);
  } catch {
    return identifier;
  }
}

export function getEventTargetElement(target: EventTarget | null) {
  if (target instanceof Element) {
    return target;
  }
  if (target instanceof Node) {
    return target.parentElement;
  }
  return null;
}

export function normalizeWikiSyntax(markdown: string, pages: WikiPage[]) {
  return markdown.replaceAll(WIKI_LINK_REGEX, (_full, rawTitle: string) => {
    const title = rawTitle.trim();

    if (!title) {
      return _full;
    }

    return `[${title}](${getWikiHref(title, pages)})`;
  });
}

export function clearSlashText(editor: Editor, match: SlashMatch | null) {
  if (!match) {
    return;
  }

  editor.chain().focus().deleteRange({ from: match.from, to: match.to }).run();
}

export function insertWikiLink(
  editor: Editor,
  title: string,
  pages: WikiPage[],
  range?: { from: number; to: number }
) {
  const chain = editor.chain().focus();

  if (range) {
    chain.deleteRange(range);
  }

  chain
    .insertContent([
      {
        type: "text",
        text: title,
        marks: [{ type: "link", attrs: { href: getWikiHref(title, pages) } }],
      },
      { type: "text", text: " " },
    ])
    .run();
}

export function getScrollTarget(
  scrollContainerRef: RefObject<HTMLDivElement | null>
) {
  return scrollContainerRef.current ?? window;
}

export function getActiveCodeBlockNode(editor: Editor) {
  const { $from } = editor.state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "codeBlock") {
      return { node, pos: $from.before(depth) };
    }
  }

  return null;
}
