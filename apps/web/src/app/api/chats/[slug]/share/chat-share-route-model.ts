export function buildChatShareUrl(baseUrl: string, token: string) {
  return `${baseUrl}/share/${token}`;
}

export const CHAT_SHARE_CONTEXT_ERROR = "Unable to resolve chat share context.";

export function parseChatShareGrantBody(body: { email?: unknown }) {
  const email = typeof body.email === "string" ? body.email.trim() : "";

  return {
    email: email.length > 0 ? email : null,
  };
}

export function resolveChatShareRouteError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
