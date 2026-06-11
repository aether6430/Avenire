import { NextResponse } from "next/server";
import { invalidateFlashcardReadCaches } from "@/lib/domain-cache";
import { reviewFlashcardForUser } from "@/lib/flashcards";
import "@/lib/learning-automation";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";
import { flashcardReviewSchema } from "../flashcard-route-model";

export async function POST(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = flashcardReviewSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "cardId and rating are required" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const result = await reviewFlashcardForUser({
    cardId: body.cardId,
    rating: body.rating,
    answerText: body.answerText ?? null,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });

  if (!result) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  await invalidateFlashcardReadCaches(ctx.workspace.workspaceId);

  void publishWorkspaceStreamEvent({
    workspaceUuid: ctx.workspace.workspaceId,
    type: "flashcards.invalidate",
    payload: {
      action: "reviewed",
      cardId: body.cardId,
      workspaceUuid: ctx.workspace.workspaceId,
    },
  });

  return NextResponse.json(result);
}
