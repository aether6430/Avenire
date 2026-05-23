import { NextResponse } from "next/server";
import { getFlashcardSetForUser } from "@/lib/flashcards";
import {
  FLASHCARD_SET_DETAIL_LOAD_ERROR,
  resolveFlashcardSetDetailResponse,
  resolveFlashcardSetsRouteError,
} from "../flashcard-sets-route-model";

export async function handleFlashcardSetRouteGet(input: {
  setId: string;
  userId: string;
  workspaceId: string;
}) {
  try {
    const set = await getFlashcardSetForUser(
      input.userId,
      input.workspaceId,
      input.setId
    );

    if (!set) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    return NextResponse.json(resolveFlashcardSetDetailResponse({ set }));
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardSetsRouteError(
          error,
          FLASHCARD_SET_DETAIL_LOAD_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
