import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import {
  FLASHCARD_SET_CARD_CREATE_ERROR,
  resolveFlashcardSetCardRouteError,
} from "./flashcard-set-cards-route-model";
import { handleFlashcardSetCardsRoutePost } from "./flashcard-set-cards-route-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ setId: string }> }
) {
  try {
    const ctx = await getWorkspaceContextForUser();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { setId } = await context.params;
    return await handleFlashcardSetCardsRoutePost({
      request,
      setId,
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardSetCardRouteError(
          error,
          FLASHCARD_SET_CARD_CREATE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
