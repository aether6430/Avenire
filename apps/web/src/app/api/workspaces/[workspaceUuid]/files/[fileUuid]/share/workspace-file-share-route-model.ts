export function buildWorkspaceFileShareUrl(baseUrl: string, token: string) {
  return `${baseUrl}/share/${token}`;
}

export function normalizeWorkspaceFileSharePermission(
  permission?: unknown
): "viewer" | "editor" {
  return permission === "editor" ? "editor" : "viewer";
}

export function parseWorkspaceFileShareGrantBody(body: {
  email?: unknown;
  permission?: unknown;
}) {
  const email = typeof body.email === "string" ? body.email.trim() : "";

  return {
    email: email.length > 0 ? email : null,
    permission: normalizeWorkspaceFileSharePermission(body.permission),
  };
}
