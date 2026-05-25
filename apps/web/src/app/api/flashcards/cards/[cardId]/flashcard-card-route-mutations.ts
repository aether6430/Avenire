import { NextResponse } from "next/server";
import { invalidateFlashcardReadCaches } from "@/lib/domain-cache";
import {
  archiveFlashcardCardForUser,
  updateFlashcardCardForUser,
} from "@/lib/flashcards";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";
import {
  FLASHCARD_CARD_DELETE_ERROR,
  FLASHCARD_CARD_INVALID_PAYLOAD_ERROR,
  FLASHCARD_CARD_UPDATE_ERROR,
  normalizeFlashcardCardId,
  parseFlashcardCardUpdatePayload,
  resolveFlashcardCardInvalidateEventPayload,
  resolveFlashcardCardRouteError,
} from "./flashcard-card-route-model";

export async function handleFlashcardCardRoutePatch(input: {
  cardId: string;
  request: Request;
  userId: string;
  workspaceId: string;
}) {
  try {
    const payload = await input.request.json().catch(() => ({}));
    const parsed = parseFlashcardCardUpdatePayload(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: FLASHCARD_CARD_INVALID_PAYLOAD_ERROR },
        { status: 400 }
      );
    }

    const cardId = normalizeFlashcardCardId(input.cardId);
    const card = await updateFlashcardCardForUser({
      backMarkdown: parsed.data.backMarkdown,
      cardId,
      frontMarkdown: parsed.data.frontMarkdown,
      notesMarkdown: parsed.data.notesMarkdown,
      source: parsed.data.source,
      tags: parsed.data.tags,
      userId: input.userId,
      workspaceId: input.workspaceId,
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    await invalidateFlashcardReadCaches(input.workspaceId);

    void publishWorkspaceStreamEvent({
      payload: resolveFlashcardCardInvalidateEventPayload({
        action: "updated",
        cardId: card.id,
        setId: card.setId,
        workspaceUuid: input.workspaceId,
      }),
      type: "flashcards.invalidate",
      workspaceUuid: input.workspaceId,
    });

    return NextResponse.json({ card });
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

export async function handleFlashcardCardRouteDelete(input: {
  cardId: string;
  userId: string;
  workspaceId: string;
}) {
  try {
    const cardId = normalizeFlashcardCardId(input.cardId);
    const card = await archiveFlashcardCardForUser(
      input.userId,
      input.workspaceId,
      cardId
    );

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    await invalidateFlashcardReadCaches(input.workspaceId);

    void publishWorkspaceStreamEvent({
      payload: resolveFlashcardCardInvalidateEventPayload({
        action: "deleted",
        cardId,
        setId: card.setId,
        workspaceUuid: input.workspaceId,
      }),
      type: "flashcards.invalidate",
      workspaceUuid: input.workspaceId,
    });

    return NextResponse.json({ ok: true });
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
