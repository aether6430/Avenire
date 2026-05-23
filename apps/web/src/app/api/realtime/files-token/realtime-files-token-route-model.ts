const REALTIME_FILES_TOKEN_TTL_SECONDS = 60;
export const REALTIME_FILES_TOKEN_ROUTE_ERROR =
  "Unable to issue realtime files token.";

export function resolveRealtimeFilesTokenWorkspaceUuid(body: {
  workspaceUuid?: unknown;
}) {
  return typeof body.workspaceUuid === "string"
    ? body.workspaceUuid.trim()
    : "";
}

export function resolveRealtimeFilesTokenLifetimeSeconds() {
  return REALTIME_FILES_TOKEN_TTL_SECONDS;
}

export function resolveRealtimeFilesTokenRouteError(
  error: unknown,
  fallback = REALTIME_FILES_TOKEN_ROUTE_ERROR
) {
  return error instanceof Error ? error.message : fallback;
}
