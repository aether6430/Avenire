export function resolveRealtimeFilesQuery(request: Request) {
  const url = new URL(request.url);
  return {
    token: url.searchParams.get("token")?.trim() ?? "",
    workspaceUuid: url.searchParams.get("workspaceUuid")?.trim() ?? "",
  };
}

export function toRealtimeFilesInvalidateChunk(
  payload: Record<string, unknown>
) {
  return `event: files.invalidate\ndata: ${JSON.stringify(payload)}\n\n`;
}

export function buildRealtimeFilesHeaders() {
  return {
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
  };
}
