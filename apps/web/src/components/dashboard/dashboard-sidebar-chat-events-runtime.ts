import type { Route } from "next";
import type { ChatSummary } from "@/lib/chat-data";
import type {
  ChatCreatedDetail,
  ChatNameUpdatedDetail,
  ChatStreamStatusDetail,
} from "@/lib/chat-events";

type SidebarNavigate = (
  href: string,
  navigateOptions?: {
    openInNewPane?: boolean;
    replace?: boolean;
    scroll?: boolean;
  }
) => void;

export function resolveDashboardPendingCreatedChat(input: {
  activeChatSlug: string;
  detail: ChatCreatedDetail;
  pathname: string;
  workspaceUuid: string | null;
}) {
  if (
    !(
      input.pathname === "/workspace/chats/new" ||
      input.activeChatSlug === "new" ||
      input.detail.fromId === "new"
    )
  ) {
    return null;
  }

  const timestamp = new Date().toISOString();
  return {
    activeChatSlugOverride: input.detail.id,
    navigateTo: `/workspace/chats/${input.detail.id}` as Route,
    pendingCreatedChat: {
      branching: null,
      createdAt: timestamp,
      icon: null,
      id: input.detail.id,
      lastMessageAt: timestamp,
      pinned: false,
      slug: input.detail.id,
      title: input.detail.title,
      updatedAt: timestamp,
      workspaceId: input.workspaceUuid,
    } satisfies ChatSummary,
  };
}

export function applyDashboardChatNameUpdate(input: {
  detail: ChatNameUpdatedDetail;
  pendingCreatedChat: ChatSummary | null;
  previousChats: ChatSummary[];
}) {
  const timestamp = new Date().toISOString();
  const nextPendingCreatedChat =
    input.pendingCreatedChat?.slug === input.detail.id
      ? {
          ...input.pendingCreatedChat,
          icon: input.detail.icon ?? input.pendingCreatedChat.icon ?? null,
          title: input.detail.name,
          updatedAt: timestamp,
        }
      : input.pendingCreatedChat;

  return {
    chats: input.previousChats.map((chat) =>
      chat.slug === input.detail.id
        ? {
            ...chat,
            title: input.detail.name,
            icon: input.detail.icon ?? chat.icon ?? null,
            updatedAt: timestamp,
          }
        : chat
    ),
    pendingCreatedChat: nextPendingCreatedChat,
  };
}

export function applyDashboardChatStreamStatus(input: {
  detail: ChatStreamStatusDetail;
  pendingCreatedChat: ChatSummary | null;
  previousChats: ChatSummary[];
  previousPendingChatSlug: string | null;
}) {
  if (
    input.detail.status === "submitted" ||
    input.detail.status === "streaming"
  ) {
    return {
      chats: input.previousChats,
      pendingChatSlug: input.detail.chatId,
      pendingCreatedChat: input.pendingCreatedChat,
    };
  }

  if (!(input.detail.status === "ready" || input.detail.status === "error")) {
    return {
      chats: input.previousChats,
      pendingChatSlug: input.previousPendingChatSlug,
      pendingCreatedChat: input.pendingCreatedChat,
    };
  }

  const shouldInsertPendingCreatedChat =
    input.detail.status === "ready" &&
    input.pendingCreatedChat?.slug === input.detail.chatId &&
    !input.previousChats.some(
      (chat) => chat.slug === input.pendingCreatedChat?.slug
    );

  return {
    chats: shouldInsertPendingCreatedChat
      ? [input.pendingCreatedChat!, ...input.previousChats]
      : input.previousChats,
    pendingChatSlug:
      input.previousPendingChatSlug === input.detail.chatId
        ? null
        : input.previousPendingChatSlug,
    pendingCreatedChat:
      input.detail.status === "ready" || input.detail.status === "error"
        ? null
        : input.pendingCreatedChat,
  };
}

export function shouldReloadDashboardChatsForInvalidation(input: {
  detail: { kind?: string; workspaceUuid?: string } | null | undefined;
  workspaceUuid: string | null;
}) {
  return Boolean(
    input.detail?.workspaceUuid &&
      input.detail.workspaceUuid === input.workspaceUuid &&
      input.detail.kind === "chat"
  );
}

export function resolveDashboardChatSessionScope(input: {
  activeChatSlug: string;
  currentScope: {
    chatId: string;
    sent: boolean;
    sessionId: string;
  } | null;
  createSessionId: () => string;
  routeView: string | null;
}) {
  const nextChatId = input.activeChatSlug || "";
  if (!nextChatId || nextChatId === "new") {
    return input.routeView === "chat" ? null : input.currentScope;
  }

  if (input.currentScope?.chatId === nextChatId) {
    return input.currentScope;
  }

  return {
    chatId: nextChatId,
    sent: false,
    sessionId: input.createSessionId(),
  };
}

export function shouldStartDashboardChatSessionCloseTimer(input: {
  routeView: string | null;
  scope: {
    chatId: string;
    sent: boolean;
    sessionId: string;
  } | null;
  timerActive: boolean;
}) {
  return Boolean(
    input.routeView !== "chat" &&
      input.scope?.chatId &&
      !input.scope.sent &&
      !input.timerActive
  );
}
