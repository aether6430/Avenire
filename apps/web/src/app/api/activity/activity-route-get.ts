import { listChatsForUser, listWorkspaceFiles } from "@avenire/database";
import { NextResponse } from "next/server";
import {
  ACTIVITY_ROUTE_LOAD_ERROR,
  buildActivityChatEvent,
  buildActivityFileEvent,
  resolveActivityRouteError,
  resolveActivityRouteLimit,
  sortActivityEvents,
} from "./activity-route-model";

export async function handleActivityGet(input: {
  request: Request;
  userId: string;
  workspaceId: string;
}) {
  const limit = resolveActivityRouteLimit(
    new URL(input.request.url).searchParams.get("limit")
  );

  try {
    const chats = await listChatsForUser(input.userId, input.workspaceId);
    const files = await listWorkspaceFiles(input.workspaceId, input.userId);

    const chatEvents = chats
      .slice(0, limit)
      .map((chat) => buildActivityChatEvent(chat));
    const fileEvents = files
      .slice(0, limit)
      .map((file) => buildActivityFileEvent(file));

    return NextResponse.json({
      events: sortActivityEvents([...chatEvents, ...fileEvents]).slice(
        0,
        limit
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveActivityRouteError(error, ACTIVITY_ROUTE_LOAD_ERROR),
      },
      { status: 500 }
    );
  }
}
