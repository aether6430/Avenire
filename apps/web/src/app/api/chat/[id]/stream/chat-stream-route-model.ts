export function resolveChatStreamActiveOrganizationId(session: {
  session?: unknown;
}) {
  const sessionDetails = session.session;
  if (!sessionDetails || typeof sessionDetails !== "object") {
    return null;
  }

  const activeOrganizationId = (
    sessionDetails as { activeOrganizationId?: unknown }
  ).activeOrganizationId;
  return typeof activeOrganizationId === "string" ? activeOrganizationId : null;
}

export function buildChatStreamUnauthorizedResponse() {
  return new Response(null, { status: 401 });
}

export function buildChatStreamInternalErrorResponse() {
  return new Response(null, { status: 500 });
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
