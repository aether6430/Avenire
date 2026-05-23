export function normalizeChatDirectoryCreateInput(input: { title?: unknown }) {
  const title = typeof input.title === "string" ? input.title.trim() : "";

  return {
    title: title.length > 0 ? title : undefined,
  };
}

function buildChatDirectoryEventPayload(input: {
  action: "created";
  chat: unknown;
  workspaceUuid: string;
}) {
  const chatSlug =
    input.chat &&
    typeof input.chat === "object" &&
    typeof (input.chat as { slug?: unknown }).slug === "string"
      ? (input.chat as { slug: string }).slug
      : null;

  return {
    action: input.action,
    chat: input.chat,
    chatSlug,
    workspaceUuid: input.workspaceUuid,
  };
}

export function buildChatDirectoryInvalidateEvent(input: {
  action: "created";
  chat: unknown;
  workspaceUuid: string;
}) {
  return {
    workspaceUuid: input.workspaceUuid,
    type: "chat.invalidate" as const,
    payload: buildChatDirectoryEventPayload(input),
  };
}

export function buildChatDirectorySpecificEvent(input: {
  action: "created";
  chat: unknown;
  workspaceUuid: string;
}) {
  return {
    workspaceUuid: input.workspaceUuid,
    type: `chat.${input.action}` as const,
    payload: buildChatDirectoryEventPayload(input),
  };
}

export function resolveChatDirectoryRouteError(
  error: unknown,
  options: {
    fallback: string;
    status?: number;
  }
) {
  return {
    error: error instanceof Error ? error.message : options.fallback,
    status: options.status ?? 500,
  };
}
