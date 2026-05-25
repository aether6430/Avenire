import { NextResponse } from "next/server";
import { createFilesRealtimeToken } from "@/lib/files-realtime-token";
import { ensureWorkspaceAccessForUser } from "@/lib/workspace";
import {
  resolveRealtimeFilesTokenLifetimeSeconds,
  resolveRealtimeFilesTokenWorkspaceUuid,
} from "./realtime-files-token-route-model";

export async function handleRealtimeFilesTokenRoutePost(input: {
  request: Request;
  userId: string;
}) {
  const body = (await input.request.json().catch(() => ({}))) as {
    workspaceUuid?: string;
  };

  const workspaceUuid = resolveRealtimeFilesTokenWorkspaceUuid(body);
  if (!workspaceUuid) {
    return NextResponse.json(
      { error: "Missing workspaceUuid" },
      { status: 400 }
    );
  }

  const hasAccess = await ensureWorkspaceAccessForUser(
    input.userId,
    workspaceUuid
  );
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.SSE_TOKEN_SECRET) {
    return NextResponse.json(
      { error: "Realtime unavailable" },
      { status: 503 }
    );
  }

  const ttlSeconds = resolveRealtimeFilesTokenLifetimeSeconds();
  const token = createFilesRealtimeToken({
    userId: input.userId,
    workspaceUuid,
    ttlSeconds,
  });

  return NextResponse.json({ expiresInSeconds: ttlSeconds, token });
}
