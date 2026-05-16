import { NextResponse } from "next/server";
import { getFlashcardSetForUser } from "@/lib/flashcards";
import { resolveFlashcardSetDetailResponse } from "../flashcard-sets-route-model";

export async function handleFlashcardSetRouteGet(input: {
  setId: string;
  userId: string;
  workspaceId: string;
}) {
  const set = await getFlashcardSetForUser(
    input.userId,
    input.workspaceId,
    input.setId
  );

  if (!set) {
    return NextResponse.json({ error: "Set not found" }, { status: 404 });
  }

  return NextResponse.json(resolveFlashcardSetDetailResponse({ set }));
}
