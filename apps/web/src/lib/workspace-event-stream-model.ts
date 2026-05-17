export interface WorkspaceStreamEvent {
  payload: Record<string, unknown>;
  requestId: string | null;
  streamId: string;
  ts: number;
  type: string;
  workspaceUuid: string;
}

export function getStreamKey(workspaceUuid: string) {
  return `workspace:events:${workspaceUuid}`;
}

export function toPositiveInt(raw: string | undefined, fallback: number) {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function toWorkspaceEvent(
  workspaceUuid: string,
  entry: unknown
): WorkspaceStreamEvent | null {
  if (!Array.isArray(entry) || entry.length < 2) {
    return null;
  }

  const streamId = typeof entry[0] === "string" ? entry[0] : null;
  const fields = entry[1];
  if (!(streamId && Array.isArray(fields))) {
    return null;
  }

  const kv = new Map<string, string>();
  for (let index = 0; index < fields.length - 1; index += 2) {
    const key = fields[index];
    const value = fields[index + 1];
    if (typeof key === "string" && typeof value === "string") {
      kv.set(key, value);
    }
  }

  const type = kv.get("type") ?? "workspace.event";
  const tsRaw = Number.parseInt(kv.get("ts") ?? "", 10);
  const ts = Number.isFinite(tsRaw) ? tsRaw : Date.now();
  const payloadRaw = kv.get("payload") ?? "{}";
  const requestIdRaw = kv.get("requestId");

  let payload: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(payloadRaw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      payload = parsed as Record<string, unknown>;
    }
  } catch {
    payload = { raw: payloadRaw };
  }

  return {
    streamId,
    workspaceUuid,
    type,
    payload,
    ts,
    requestId:
      typeof requestIdRaw === "string" && requestIdRaw.length > 0
        ? requestIdRaw
        : null,
  };
}
