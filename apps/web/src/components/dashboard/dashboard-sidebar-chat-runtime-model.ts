import type { ChatSummary } from "@avenire/database";
import type { Route } from "next";

export type DashboardSidebarChatRow =
  | { key: string; type: "header"; title: string }
  | { chat: ChatSummary; key: string; type: "chat" };

const CHAT_DATE_GROUP_ORDER = [
  "Today",
  "Yesterday",
  "Previous 7 days",
  "Previous 30 days",
  "Older",
] as const;

export function resolveDashboardSidebarActiveChatSlug(input: {
  activeChatSlugFromPath: string;
  activeChatSlugProp?: string;
}) {
  return input.activeChatSlugFromPath || input.activeChatSlugProp || "";
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

export function getDashboardSidebarChatDateGroup(
  chat: Pick<ChatSummary, "lastMessageAt" | "updatedAt">,
  now = new Date()
) {
  const primaryTimestamp = new Date(chat.updatedAt);
  const fallbackTimestamp = new Date(chat.lastMessageAt);
  const updated = Number.isNaN(primaryTimestamp.getTime())
    ? fallbackTimestamp
    : primaryTimestamp;

  if (Number.isNaN(updated.getTime())) {
    return "Older";
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const previous7 = new Date(startOfToday);
  previous7.setDate(previous7.getDate() - 7);

  const previous30 = new Date(startOfToday);
  previous30.setDate(previous30.getDate() - 30);

  if (updated >= startOfToday) {
    return "Today";
  }
  if (updated >= startOfYesterday) {
    return "Yesterday";
  }
  if (updated >= previous7) {
    return "Previous 7 days";
  }
  if (updated >= previous30) {
    return "Previous 30 days";
  }

  return "Older";
}

export function buildDashboardSidebarChatRows(input: {
  now?: Date;
  otherChats: ChatSummary[];
  pinnedChats: ChatSummary[];
}) {
  const rows: DashboardSidebarChatRow[] = [];

  if (input.pinnedChats.length > 0) {
    rows.push({
      key: "header-pinned",
      title: "Pinned Methods",
      type: "header",
    });
    for (const chat of input.pinnedChats) {
      rows.push({ chat, key: `chat-${chat.slug}`, type: "chat" });
    }
  }

  const otherChatsByDate = new Map<string, ChatSummary[]>();
  for (const chat of input.otherChats) {
    const group = getDashboardSidebarChatDateGroup(chat, input.now);
    otherChatsByDate.set(group, [...(otherChatsByDate.get(group) ?? []), chat]);
  }

  for (const title of CHAT_DATE_GROUP_ORDER) {
    const chats = otherChatsByDate.get(title) ?? [];
    if (chats.length === 0) {
      continue;
    }

    rows.push({
      key: `header-${title.toLowerCase().replaceAll(" ", "-")}`,
      title,
      type: "header",
    });
    for (const chat of chats) {
      rows.push({ chat, key: `chat-${chat.slug}`, type: "chat" });
    }
  }

  return rows;
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
