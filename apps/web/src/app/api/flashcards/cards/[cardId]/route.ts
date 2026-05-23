import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import {
  FLASHCARD_CARD_DELETE_ERROR,
  FLASHCARD_CARD_UPDATE_ERROR,
  resolveFlashcardCardRouteError,
} from "./flashcard-card-route-model";
import {
  handleFlashcardCardRouteDelete,
  handleFlashcardCardRoutePatch,
} from "./flashcard-card-route-mutations";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ cardId: string }> }
) {
  try {
    const ctx = await getWorkspaceContextForUser();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = await context.params;
    return await handleFlashcardCardRoutePatch({
      cardId,
      request,
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardCardRouteError(
          error,
          FLASHCARD_CARD_UPDATE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ cardId: string }> }
) {
  try {
    const ctx = await getWorkspaceContextForUser();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = await context.params;
    return await handleFlashcardCardRouteDelete({
      cardId,
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardCardRouteError(
          error,
          FLASHCARD_CARD_DELETE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
