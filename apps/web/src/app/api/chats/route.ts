import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { Schema } from "effect-v4";
import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api-request";
import { createChatForUser } from "@/lib/chat-data";
import { invalidateChatReadCaches } from "@/lib/domain-cache";
import { resolveWorkspaceForUser } from "@/lib/file-data";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ?? null;
}

export async function POST(request: Request) {
  const session = await getSessionUser();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonRequest(
    request,
    Schema.Struct({ title: Schema.optional(Schema.String) })
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const body = parsed.data;

  const activeOrganizationId = session.session.activeOrganizationId ?? null;
  const workspace = await resolveWorkspaceForUser(
    session.user.id,
    activeOrganizationId
  );
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }
  const chat = await createChatForUser(
    session.user.id,
    workspace.workspaceId,
    body.title
  );

  await invalidateChatReadCaches(workspace.workspaceId);

  const chatEventPayload = {
    action: "created",
    chat,
    chatSlug: chat.slug,
    workspaceUuid: workspace.workspaceId,
  };

  void Promise.all([
    publishWorkspaceStreamEvent({
      workspaceUuid: workspace.workspaceId,
      type: "chat.created",
      payload: chatEventPayload,
    }),
    publishWorkspaceStreamEvent({
      workspaceUuid: workspace.workspaceId,
      type: "chat.invalidate",
      payload: chatEventPayload,
    }),
  ]);

  return NextResponse.json({ chat }, { status: 201 });
}
