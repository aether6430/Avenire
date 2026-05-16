import type { ComponentType, SVGProps } from "react";

export type PaletteIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type PaletteSearchType = "chat" | "flashcard";

export interface PaletteSearchItem {
  description: string;
  id: string;
  label: string;
  meta: string;
  path: string;
  type: PaletteSearchType;
}

export interface PaletteCommandItem {
  description: string;
  group: "General" | "Create";
  icon: PaletteIcon;
  key: string;
  label: string;
  onSelect: () => void;
  searchTerms: string[];
  shortcut?: string;
}

export interface WorkspaceSummary {
  logo?: string | null;
  name: string;
  organizationId?: string;
  rootFolderId: string;
  workspaceId: string;
}

export function resolveCommandPaletteWorkspaceFilesRoute(options: {
  workspaceId: string | null;
  workspaces: WorkspaceSummary[];
}) {
  const workspace = options.workspaces.find(
    (entry) => entry.workspaceId === options.workspaceId
  );

  if (workspace?.workspaceId && workspace.rootFolderId) {
    return `/workspace/files/${workspace.workspaceId}/folder/${workspace.rootFolderId}`;
  }

  if (workspace?.workspaceId) {
    return `/workspace/files/${workspace.workspaceId}`;
  }

  return "/workspace/files";
}

export function buildCommandPaletteFileTargetRoute(options: {
  fileId: string;
  folderId: string;
  retrievalChunkId?: string | null;
  workspaceId: string;
}) {
  const params = new URLSearchParams();
  params.set("file", options.fileId);
  if (options.retrievalChunkId) {
    params.set("retrievalChunk", options.retrievalChunkId);
  }

  return `/workspace/files/${options.workspaceId}/folder/${options.folderId}?${params.toString()}`;
}

export function shouldReplaceCommandPaletteFileRoute(options: {
  currentFilesFolderId: string | null;
  currentFilesWorkspaceUuid: string | null;
  folderId: string;
  workspaceId: string;
}) {
  return (
    options.currentFilesWorkspaceUuid === options.workspaceId &&
    options.currentFilesFolderId === options.folderId
  );
}

export function getCommandPaletteTasksState(input: {
  loadFailed: boolean;
  taskCount: number;
}) {
  if (input.loadFailed && input.taskCount === 0) {
    return {
      message: "Unable to load tasks.",
      showGroup: true,
    };
  }

  return {
    message: null,
    showGroup: input.taskCount > 0,
  };
}

export function buildCommandPaletteMethodValue(input: {
  description: string;
  label: string;
}) {
  return `${input.label} ${input.description} method chat`;
}

export function buildCommandPaletteMindsetSetValue(input: {
  description: string;
  label: string;
}) {
  return `${input.label} ${input.description} mindset set flashcard`;
}

export function buildCommandPaletteRecentMethodValue(input: {
  slug: string;
  title: string;
}) {
  return `${input.title} ${input.slug} method chat`;
}

export function buildCommandPaletteRecentMindsetSetValue(input: {
  id: string;
  title: string;
}) {
  return `${input.title} ${input.id} mindset set flashcard`;
}

export const FILE_FUSE_OPTIONS = {
  includeScore: true,
  ignoreLocation: true,
  keys: ["name", "path", "workspaceName"],
  threshold: 0.45,
};

export const FILE_RESULTS_LIMIT = 8;
export const FILES_ROUTE_PATTERN =
  /^\/workspace\/files\/([^/]+)\/folder\/([^/?#]+)$/;

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === "textarea" || tagName === "select") {
    return true;
  }

  if (tagName !== "input") {
    return false;
  }

  const input = target as HTMLInputElement;
  const ignoredInputTypes = new Set([
    "button",
    "checkbox",
    "color",
    "file",
    "hidden",
    "image",
    "radio",
    "range",
    "reset",
    "submit",
  ]);

  return !ignoredInputTypes.has(input.type.toLowerCase());
}

export function shouldIgnoreGlobalHotkey(event: KeyboardEvent): boolean {
  const activeElement = document.activeElement;

  return isTypingTarget(event.target) || isTypingTarget(activeElement);
}

export function commandMatches(item: PaletteCommandItem, needle: string) {
  const haystack = [item.label, item.description, ...item.searchTerms]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function matchesNeedle(value: string, needle: string) {
  return value.toLowerCase().includes(needle);
}

export const PALETTE_GROUP_CLASS =
  "overflow-hidden px-1 py-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground/60 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider";

export const PALETTE_ITEM_CLASS =
  "group relative flex cursor-pointer select-none items-start gap-3 rounded px-2.5 py-2 text-sm outline-none data-[selected=true]:bg-primary/15 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 hover:bg-primary/10 transition-colors duration-100";

export const PALETTE_ICON_CLASS =
  "mt-0.5 size-4 shrink-0 text-muted-foreground/70";

export const PALETTE_CHEVRON_CLASS =
  "mt-0.5 ml-auto size-3.5 shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 text-muted-foreground/50";
