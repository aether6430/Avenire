export const CHAT_ICON_NAMES = [
  "MessageSquareText",
  "BookOpenCheck",
  "FileText",
  "FileCode2",
  "BrainIcon",
  "Clock3",
  "LibraryBig",
  "Sparkles",
  "MessageSquareDashed",
  "Tag",
  "Folder",
  "FolderOpen",
] as const;

export type ChatIconName = (typeof CHAT_ICON_NAMES)[number];

export const DEFAULT_CHAT_ICON: ChatIconName = "MessageSquareText";

export const isChatIconName = (
  value: string | null | undefined
): value is ChatIconName =>
  Boolean(value) &&
  CHAT_ICON_NAMES.includes(value as ChatIconName);
