import { NextResponse } from "next/server";
import { invalidateFlashcardReadCaches } from "@/lib/domain-cache";
import { reviewFlashcardForUser } from "@/lib/flashcards";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";
import {
  buildFlashcardsReviewInvalidateEventPayload,
  FLASHCARDS_REVIEW_INVALID_PAYLOAD_ERROR,
  parseFlashcardsReviewPayload,
} from "./flashcards-review-route-model";

export async function handleFlashcardsReviewRoutePost(input: {
  request: Request;
  userId: string;
  workspaceId: string;
}) {
  const payload = await input.request.json().catch(() => ({}));
  const parsed = parseFlashcardsReviewPayload(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: FLASHCARDS_REVIEW_INVALID_PAYLOAD_ERROR },
      { status: 400 }
    );
  }

  const result = await reviewFlashcardForUser({
    answerText: parsed.data.answerText ?? null,
    cardId: parsed.data.cardId,
    rating: parsed.data.rating,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  if (!result) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  await invalidateFlashcardReadCaches(input.workspaceId);

  void publishWorkspaceStreamEvent({
    payload: buildFlashcardsReviewInvalidateEventPayload({
      cardId: parsed.data.cardId,
      workspaceUuid: input.workspaceId,
    }),
    type: "flashcards.invalidate",
    workspaceUuid: input.workspaceId,
  });

  return NextResponse.json(result);
}
