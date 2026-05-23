import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleNoteSyncRouteGet } from "./note-sync-route-get";
import {
  NOTE_SYNC_GET_ERROR,
  NOTE_SYNC_POST_ERROR,
  resolveNoteSyncRouteError,
} from "./note-sync-route-model";
import { handleNoteSyncRoutePost } from "./note-sync-route-post";

export async function GET(
  _request: Request,
  context: { params: Promise<{ noteId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { noteId } = await context.params;
    return await handleNoteSyncRouteGet({
      noteId,
      userId: user.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveNoteSyncRouteError(error, NOTE_SYNC_GET_ERROR),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ noteId: string }> }
) {
  try {
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
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveNoteSyncRouteError(error, NOTE_SYNC_POST_ERROR),
      },
      { status: 500 }
    );
  }
}
