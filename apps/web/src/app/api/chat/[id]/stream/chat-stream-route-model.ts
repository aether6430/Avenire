export function resolveChatStreamActiveOrganizationId(session: {
  session?: {
    activeOrganizationId?: string | null;
  };
}) {
  return session.session?.activeOrganizationId ?? null;
}

export function buildChatStreamNoStoreHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

export function buildChatStreamSuccessHeaders(headers: Record<string, string>) {
  return {
    ...headers,
    ...buildChatStreamNoStoreHeaders(),
  };
}
