import type { ChatSummary } from "@avenire/database";
import type {
  ChatNameUpdatedDetail,
  ChatStreamStatusDetail,
} from "@/lib/chat-events";

export interface DashboardWorkspaceInvalidationPayload {
  action?: string | null;
  chat?: unknown;
  chatSlug?: string | null;
  fileId?: string | null;
  folderId?: string | null;
  reason?: string | null;
  workspaceUuid?: string | null;
}

export function parseDashboardWorkspaceInvalidationPayload(
  raw: string | null | undefined
): DashboardWorkspaceInvalidationPayload | null {
  if (typeof raw !== "string") {
    return null;
  }

  try {
    return JSON.parse(raw) as DashboardWorkspaceInvalidationPayload;
  } catch {
    return null;
  }
}

function isDashboardRealtimeChatSummary(value: unknown): value is ChatSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ChatSummary>;
  return (
    typeof candidate.slug === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.lastMessageAt === "string"
  );
}

export function applyDashboardChatNameUpdate(input: {
  detail: ChatNameUpdatedDetail;
  previousChats: ChatSummary[];
}) {
  const timestamp = new Date().toISOString();

  return input.previousChats.map((chat) =>
    chat.slug === input.detail.id
      ? {
          ...chat,
          title: input.detail.name,
          icon: input.detail.icon ?? chat.icon ?? null,
          updatedAt: timestamp,
        }
      : chat
  );
}

export function applyDashboardChatStreamStatus(input: {
  detail: ChatStreamStatusDetail;
  previousPendingChatSlug: string | null;
}) {
  if (
    input.detail.status === "submitted" ||
    input.detail.status === "streaming"
  ) {
    return {
      pendingChatSlug: input.detail.chatId,
      shouldReload: true,
    };
  }

  if (input.detail.status === "ready") {
    return {
      pendingChatSlug:
        input.previousPendingChatSlug === input.detail.chatId
          ? null
          : input.previousPendingChatSlug,
      shouldReload: true,
    };
  }

  if (input.detail.status === "error") {
    return {
      pendingChatSlug:
        input.previousPendingChatSlug === input.detail.chatId
          ? null
          : input.previousPendingChatSlug,
      shouldReload: false,
    };
  }

  return {
    pendingChatSlug: input.previousPendingChatSlug,
    shouldReload: false,
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

export function applyDashboardChatInvalidation(input: {
  detail:
    | {
        kind?: string;
        payload?: DashboardWorkspaceInvalidationPayload | null;
        workspaceUuid?: string;
      }
    | null
    | undefined;
  previousChats: ChatSummary[];
  workspaceUuid: string | null;
}) {
  if (
    !(
      input.detail?.workspaceUuid &&
      input.detail.workspaceUuid === input.workspaceUuid &&
      input.detail.kind === "chat" &&
      input.detail.payload?.action
    )
  ) {
    return null;
  }

  if (
    input.detail.payload.action === "deleted" &&
    input.detail.payload.chatSlug
  ) {
    return input.previousChats.filter(
      (chat) => chat.slug !== input.detail?.payload?.chatSlug
    );
  }

  if (
    (input.detail.payload.action === "created" ||
      input.detail.payload.action === "updated") &&
    isDashboardRealtimeChatSummary(input.detail.payload.chat)
  ) {
    const nextChat = input.detail.payload.chat;
    const existingIndex = input.previousChats.findIndex(
      (chat) => chat.slug === nextChat.slug
    );
    if (existingIndex === -1) {
      return [nextChat, ...input.previousChats];
    }

    return input.previousChats.map((chat) =>
      chat.slug === nextChat.slug ? nextChat : chat
    );
  }

  return null;
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
