import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { handleFlashcardSetsRouteGet } from "./flashcard-sets-route-get";
import {
  FLASHCARD_SET_CREATE_ERROR,
  FLASHCARD_SET_LIST_LOAD_ERROR,
  resolveFlashcardSetsRouteError,
} from "./flashcard-sets-route-model";
import { handleFlashcardSetsRoutePost } from "./flashcard-sets-route-post";

export async function GET() {
  try {
    const ctx = await getWorkspaceContextForUser();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleFlashcardSetsRouteGet({
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardSetsRouteError(
          error,
          FLASHCARD_SET_LIST_LOAD_ERROR
        ),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getWorkspaceContextForUser();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleFlashcardSetsRoutePost({
      request,
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardSetsRouteError(
          error,
          FLASHCARD_SET_CREATE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
