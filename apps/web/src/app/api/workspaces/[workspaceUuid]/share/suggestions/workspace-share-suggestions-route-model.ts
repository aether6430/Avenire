import { resolveApiErrorMessage } from "@/lib/api-error-message";

export function resolveWorkspaceShareSuggestionsQuery(request: Request) {
  return new URL(request.url).searchParams.get("q")?.trim() ?? "";
}

export const WORKSPACE_SHARE_SUGGESTIONS_ERROR =
  "Unable to load workspace share suggestions.";

export function resolveWorkspaceShareSuggestionsRouteError(
  error: unknown,
  fallback: string
) {
  return resolveApiErrorMessage(error, fallback);
}
