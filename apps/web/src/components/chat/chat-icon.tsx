import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  BrainIcon,
  Clock3,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  LibraryBig,
  MessageSquareDashed,
  MessageSquareText,
  Sparkles,
  Tag,
} from "lucide-react";
import { type ChatIconName } from "@/lib/chat-icons";
import { cn } from "@/lib/utils";

const CHAT_ICON_COMPONENTS: Record<ChatIconName, LucideIcon> = {
  MessageSquareText,
  BookOpenCheck,
  FileText,
  FileCode2,
  BrainIcon,
  Clock3,
  LibraryBig,
  Sparkles,
  MessageSquareDashed,
  Tag,
  Folder,
  FolderOpen,
};

export function ChatIcon({
  name,
  className,
}: {
  name: ChatIconName;
  className?: string;
}) {
  const Icon = CHAT_ICON_COMPONENTS[name];
  if (!Icon) {
    return null;
  }
  return <Icon className={cn("size-4", className)} />;
}
