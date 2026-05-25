function buildChatEventPayload(input: {
  workspaceUuid: string;
  chatSlug: string;
  action: "created" | "updated" | "deleted";
  chat?: unknown;
}) {
  return {
    action: input.action,
    chat: input.chat,
    chatSlug: input.chatSlug,
    workspaceUuid: input.workspaceUuid,
  };
}

export function normalizeChatSlugPatch(input: {
  title?: unknown;
  pinned?: unknown;
  icon?: unknown;
}) {
  return {
    title: typeof input.title === "string" ? input.title : undefined,
    pinned: typeof input.pinned === "boolean" ? input.pinned : undefined,
    icon:
      typeof input.icon === "string" || input.icon === null
        ? input.icon
        : undefined,
  };
}

export function buildChatInvalidateEvent(input: {
  workspaceUuid: string;
  chatSlug: string;
  action: "created" | "updated" | "deleted";
  chat?: unknown;
}) {
  return {
    workspaceUuid: input.workspaceUuid,
    type: "chat.invalidate" as const,
    payload: buildChatEventPayload(input),
  };
}

export function buildSpecificChatEvent(input: {
  workspaceUuid: string;
  chatSlug: string;
  action: "created" | "updated" | "deleted";
  chat?: unknown;
}) {
  return {
    workspaceUuid: input.workspaceUuid,
    type: `chat.${input.action}` as const,
    payload: buildChatEventPayload(input),
  };
}

export const CHAT_SLUG_LOAD_ERROR = "Unable to load Method.";
export const CHAT_SLUG_UPDATE_ERROR = "Unable to update Method.";
export const CHAT_SLUG_BRANCH_ERROR = "Unable to branch Method.";
export const CHAT_SLUG_DELETE_ERROR = "Unable to delete Method.";

export function resolveChatSlugRouteError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
