export function buildWorkspaceFolderShareUrl(baseUrl: string, token: string) {
  return `${baseUrl}/share/${token}`;
}

export function normalizeWorkspaceFolderSharePermission(
  permission?: unknown
): "viewer" | "editor" {
  return permission === "editor" ? "editor" : "viewer";
}

export function parseWorkspaceFolderShareGrantBody(body: {
  email?: unknown;
  permission?: unknown;
}) {
  const email = typeof body.email === "string" ? body.email.trim() : "";

  return {
    email: email.length > 0 ? email : null,
    permission: normalizeWorkspaceFolderSharePermission(body.permission),
  };
}
