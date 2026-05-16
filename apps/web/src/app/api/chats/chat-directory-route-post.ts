import { NextResponse } from "next/server";
import { createChatForUser } from "@/lib/chat-data";
import { invalidateChatReadCaches } from "@/lib/domain-cache";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";
import { resolveChatDirectoryRouteContext } from "./chat-directory-route-context";
import {
  buildChatDirectoryInvalidateEvent,
  normalizeChatDirectoryCreateInput,
  resolveChatDirectoryRouteError,
} from "./chat-directory-route-model";

export async function handleChatDirectoryRoutePost(input: {
  request: Request;
}) {
  const context = await resolveChatDirectoryRouteContext();
  if (!context.ok) {
    return context.response;
  }

  const body = normalizeChatDirectoryCreateInput(
    (await input.request.json().catch(() => ({}))) as { title?: unknown }
  );

  try {
    const chat = await createChatForUser(
      context.session.user.id,
      context.workspace.workspaceId,
      body.title
    );

    await invalidateChatReadCaches(context.workspace.workspaceId);

    void publishWorkspaceStreamEvent(
      buildChatDirectoryInvalidateEvent({
        action: "created",
        workspaceUuid: context.workspace.workspaceId,
      })
    );

    return NextResponse.json({ chat }, { status: 201 });
  } catch (error) {
    const failure = resolveChatDirectoryRouteError(error, {
      fallback: "Unable to create method.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
