import { NextResponse } from "next/server";
import { invalidateFlashcardReadCaches } from "@/lib/domain-cache";
import { createFlashcardCardForUser } from "@/lib/flashcards";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";
import {
  FLASHCARD_SET_CARD_INVALID_PAYLOAD_ERROR,
  normalizeFlashcardSetId,
  parseFlashcardSetCardCreatePayload,
  resolveFlashcardSetCardInvalidateEventPayload,
} from "./flashcard-set-cards-route-model";

export async function handleFlashcardSetCardsRoutePost(input: {
  request: Request;
  setId: string;
  userId: string;
  workspaceId: string;
}) {
  const payload = await input.request.json().catch(() => ({}));
  const parsed = parseFlashcardSetCardCreatePayload(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: FLASHCARD_SET_CARD_INVALID_PAYLOAD_ERROR },
      { status: 400 }
    );
  }

  const setId = normalizeFlashcardSetId(input.setId);
  const card = await createFlashcardCardForUser({
    backMarkdown: parsed.data.backMarkdown,
    frontMarkdown: parsed.data.frontMarkdown,
    notesMarkdown: parsed.data.notesMarkdown,
    setId,
    source: parsed.data.source,
    tags: parsed.data.tags,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  if (!card) {
    return NextResponse.json({ error: "Set not found" }, { status: 404 });
  }

  await invalidateFlashcardReadCaches(input.workspaceId);

  void publishWorkspaceStreamEvent({
    payload: resolveFlashcardSetCardInvalidateEventPayload({
      cardId: card.id,
      setId,
      workspaceUuid: input.workspaceId,
    }),
    type: "flashcards.invalidate",
    workspaceUuid: input.workspaceId,
  });

  return NextResponse.json({ card }, { status: 201 });
}
