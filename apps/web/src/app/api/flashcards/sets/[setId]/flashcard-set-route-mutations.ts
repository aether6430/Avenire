import { NextResponse } from "next/server";
import { invalidateFlashcardReadCaches } from "@/lib/domain-cache";
import {
  archiveFlashcardSetForUser,
  updateFlashcardSetForUser,
} from "@/lib/flashcards";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";
import {
  FLASHCARD_SET_DETAIL_DELETE_ERROR,
  FLASHCARD_SET_DETAIL_UPDATE_ERROR,
  FLASHCARD_SET_UPDATE_ERROR,
  parseFlashcardSetUpdatePayload,
  resolveFlashcardSetDetailResponse,
  resolveFlashcardSetInvalidateEventPayload,
  resolveFlashcardSetsRouteError,
} from "../flashcard-sets-route-model";

export async function handleFlashcardSetRoutePatch(input: {
  request: Request;
  setId: string;
  userId: string;
  workspaceId: string;
}) {
  try {
    const payload = await input.request.json().catch(() => ({}));
    const parsed = parseFlashcardSetUpdatePayload(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: FLASHCARD_SET_UPDATE_ERROR },
        { status: 400 }
      );
    }

    const set = await updateFlashcardSetForUser({
      description: parsed.data.description,
      setId: input.setId,
      tags: parsed.data.tags,
      title: parsed.data.title,
      userId: input.userId,
      workspaceId: input.workspaceId,
    });

    if (!set) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    await invalidateFlashcardReadCaches(input.workspaceId);

    void publishWorkspaceStreamEvent({
      payload: resolveFlashcardSetInvalidateEventPayload({
        action: "updated",
        setId: set.id,
        workspaceUuid: input.workspaceId,
      }),
      type: "flashcards.invalidate",
      workspaceUuid: input.workspaceId,
    });

    return NextResponse.json(resolveFlashcardSetDetailResponse({ set }));
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardSetsRouteError(
          error,
          FLASHCARD_SET_DETAIL_UPDATE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}

export async function handleFlashcardSetRouteDelete(input: {
  setId: string;
  userId: string;
  workspaceId: string;
}) {
  try {
    const archived = await archiveFlashcardSetForUser(
      input.userId,
      input.workspaceId,
      input.setId
    );

    if (!archived) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    await invalidateFlashcardReadCaches(input.workspaceId);

    void publishWorkspaceStreamEvent({
      payload: resolveFlashcardSetInvalidateEventPayload({
        action: "deleted",
        setId: input.setId,
        workspaceUuid: input.workspaceId,
      }),
      type: "flashcards.invalidate",
      workspaceUuid: input.workspaceId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardSetsRouteError(
          error,
          FLASHCARD_SET_DETAIL_DELETE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
