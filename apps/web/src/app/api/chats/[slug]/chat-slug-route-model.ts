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
}) {
  return {
    workspaceUuid: input.workspaceUuid,
    type: "chat.invalidate" as const,
    payload: {
      action: input.action,
      chatSlug: input.chatSlug,
      workspaceUuid: input.workspaceUuid,
    },
  };
}
