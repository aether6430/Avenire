import type { Route } from "next";
import type { ChatSummary } from "@/lib/chat-data";

export function resolveDashboardSidebarActiveChatSlug(input: {
  activeChatSlugFromPath: string;
  activeChatSlugOverride: string | null;
  activeChatSlugProp?: string;
}) {
  return (
    input.activeChatSlugFromPath ||
    input.activeChatSlugOverride ||
    input.activeChatSlugProp ||
    ""
  );
}

export function resolveDashboardSidebarPrimaryChatRoute(input: {
  activeChatSlug: string;
  chats: ChatSummary[];
}) {
  const chatSlug = input.activeChatSlug || input.chats[0]?.slug;
  return chatSlug
    ? (`/workspace/chats/${chatSlug}` as Route)
    : ("/workspace/chats/new" as Route);
}

export function sortDashboardSidebarChats(chats: ChatSummary[]) {
  return [...chats].sort((left, right) =>
    right.lastMessageAt.localeCompare(left.lastMessageAt)
  );
}

export function filterDashboardSidebarChats(input: {
  chats: ChatSummary[];
  query: string;
}) {
  const needle = input.query.trim().toLowerCase();
  const sortedChats = sortDashboardSidebarChats(input.chats);
  const pinnedChats = sortedChats.filter((chat) => chat.pinned);
  const otherChats = sortedChats.filter((chat) => !chat.pinned);

  const matchesNeedle = (chat: ChatSummary) =>
    !needle || chat.title.toLowerCase().includes(needle);

  return {
    filteredOtherChats: otherChats.filter(matchesNeedle),
    filteredPinnedChats: pinnedChats.filter(matchesNeedle),
    otherChats,
    pinnedChats,
    sortedChats,
  };
}

export function toggleDashboardSidebarChatSearchState(input: {
  isOpen: boolean;
}) {
  return input.isOpen
    ? {
        isOpen: false,
        query: "",
      }
    : {
        isOpen: true,
        query: null,
      };
}
