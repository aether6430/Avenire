import type { ChatSummary } from "@/lib/chat-data";

export function resolveSidebarChatsFromInitial(input: {
  initialChats: ChatSummary[];
  previousChats: ChatSummary[];
}) {
  if (input.initialChats.length === 0) {
    return input.previousChats;
  }

  if (input.previousChats === input.initialChats) {
    return input.previousChats;
  }

  if (
    input.previousChats.length === input.initialChats.length &&
    input.previousChats.every(
      (chat, index) => chat.id === input.initialChats[index]?.id
    )
  ) {
    return input.previousChats;
  }

  return input.initialChats;
}

export function resolveSidebarChatsForWorkspace(input: {
  activeWorkspaceId?: string | null;
  cachedChats: ChatSummary[] | null;
  hydrated: boolean;
  initialChats: ChatSummary[];
  trackedWorkspaceUuid: string | null;
  workspaceUuid: string | null;
}) {
  if (!input.hydrated || input.trackedWorkspaceUuid === input.workspaceUuid) {
    return null;
  }

  return {
    chats: input.cachedChats
      ? input.cachedChats
      : input.workspaceUuid && input.workspaceUuid === input.activeWorkspaceId
        ? input.initialChats
        : [],
    trackedWorkspaceUuid: input.workspaceUuid,
  };
}

export async function loadDashboardSidebarChats(input: {
  fetchChats: () => Promise<Response>;
  trackedWorkspaceUuid: string | null;
  workspaceUuid: string | null;
  writeCachedChats: (workspaceUuid: string, chats: ChatSummary[]) => void;
}) {
  try {
    const response = await input.fetchChats();
    if (!response.ok) {
      return {
        chats: [] as ChatSummary[],
        loadFailed: true,
      };
    }

    const payload = (await response.json()) as { chats?: ChatSummary[] };
    const chats = payload.chats ?? [];
    if (
      input.workspaceUuid &&
      input.trackedWorkspaceUuid === input.workspaceUuid
    ) {
      input.writeCachedChats(input.workspaceUuid, chats);
    }

    return {
      chats,
      loadFailed: false,
    };
  } catch {
    return {
      chats: [] as ChatSummary[],
      loadFailed: true,
    };
  }
}

export function shouldPersistSidebarChatsToCache(input: {
  trackedWorkspaceUuid: string | null;
  workspaceUuid: string | null;
}) {
  return Boolean(
    input.workspaceUuid && input.trackedWorkspaceUuid === input.workspaceUuid
  );
}
