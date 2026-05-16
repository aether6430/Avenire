export function buildChatShareUrl(baseUrl: string, token: string) {
  return `${baseUrl}/share/${token}`;
}

export function parseChatShareGrantBody(body: { email?: unknown }) {
  const email = typeof body.email === "string" ? body.email.trim() : "";

  return {
    email: email.length > 0 ? email : null,
  };
}
