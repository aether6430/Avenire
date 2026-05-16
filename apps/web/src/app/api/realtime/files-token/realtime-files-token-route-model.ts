const REALTIME_FILES_TOKEN_TTL_SECONDS = 60;

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
