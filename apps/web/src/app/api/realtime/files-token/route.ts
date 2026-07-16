import { Schema } from "effect-v4";
import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api-request";
import { createFilesRealtimeToken } from "@/lib/files-realtime-token";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonRequest(
    request,
    Schema.Struct({ workspaceUuid: Schema.optional(Schema.String) })
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const body = parsed.data;

  const workspaceUuid = body.workspaceUuid?.trim();

  if (!workspaceUuid) {
    return NextResponse.json(
      { error: "Missing workspaceUuid" },
      { status: 400 }
    );
  }

  const hasAccess = await ensureWorkspaceAccessForUser(user.id, workspaceUuid);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.SSE_TOKEN_SECRET) {
    return NextResponse.json(
      { error: "Realtime unavailable" },
      { status: 503 }
    );
  }

  const token = createFilesRealtimeToken({
    userId: user.id,
    workspaceUuid,
    ttlSeconds: 60,
  });

  return NextResponse.json({ expiresInSeconds: 60, token });
}
