import { Schema } from "effect-v4";
import { resolveApiErrorMessage } from "@/lib/api-error-message";

export const workspaceFileShareGrantSchema = Schema.Struct({
  email: Schema.optional(Schema.String),
  permission: Schema.optional(Schema.Literals(["viewer", "editor"])),
});

export function buildWorkspaceFileShareUrl(baseUrl: string, token: string) {
  return `${baseUrl}/share/${token}`;
}

export const WORKSPACE_FILE_SHARE_CONTEXT_ERROR =
  "Unable to load file share context.";

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

export function resolveWorkspaceFileShareRouteError(
  error: unknown,
  fallback: string
) {
  return resolveApiErrorMessage(error, fallback);
}
