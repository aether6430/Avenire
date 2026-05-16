import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleNoteSyncRouteGet } from "./note-sync-route-get";
import { handleNoteSyncRoutePost } from "./note-sync-route-post";

export async function GET(
  _request: Request,
  context: { params: Promise<{ noteId: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = await context.params;
  return await handleNoteSyncRouteGet({
    noteId,
    userId: user.id,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ noteId: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = await context.params;
  return await handleNoteSyncRoutePost({
    noteId,
    request,
    userId: user.id,
  });
}
