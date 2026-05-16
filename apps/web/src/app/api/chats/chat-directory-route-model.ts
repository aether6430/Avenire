export function normalizeChatDirectoryCreateInput(input: { title?: unknown }) {
  const title = typeof input.title === "string" ? input.title.trim() : "";

  return {
    title: title.length > 0 ? title : undefined,
  };
}

export function buildChatDirectoryInvalidateEvent(input: {
  action: "created";
  workspaceUuid: string;
}) {
  return {
    workspaceUuid: input.workspaceUuid,
    type: "chat.invalidate" as const,
    payload: {
      action: input.action,
      workspaceUuid: input.workspaceUuid,
    },
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
