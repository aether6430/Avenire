import type { WorkspaceStreamEvent } from "@/lib/workspace-event-stream";

export function resolveRealtimeEventsQuery(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceUuid = searchParams.get("workspaceUuid")?.trim() ?? "";
  const cursor = searchParams.get("cursor")?.trim() ?? null;
  const eventTypeFilter = searchParams.get("eventType")?.trim() ?? null;
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(500, Math.max(1, limitRaw))
    : 200;

  return {
    cursor,
    eventTypeFilter,
    limit,
    workspaceUuid,
  };
}

export function toRealtimeSseChunk(input: {
  event: string;
  data: Record<string, unknown>;
  id?: string;
}) {
  const lines: string[] = [];
  if (input.id) {
    lines.push(`id: ${input.id}`);
  }
  lines.push(`event: ${input.event}`);
  lines.push(`data: ${JSON.stringify(input.data)}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function toRealtimeEventChunk(input: {
  event: WorkspaceStreamEvent;
  workspaceUuid: string;
}) {
  return toRealtimeSseChunk({
    id: input.event.streamId,
    event: input.event.type,
    data: {
      ...input.event.payload,
      requestId: input.event.requestId,
      ts: input.event.ts,
      type: input.event.type,
      version: input.event.streamId,
      workspaceUuid: input.workspaceUuid,
    },
  });
}

export function buildRealtimeSseHeaders() {
  return {
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream; charset=utf-8",
  };
}
