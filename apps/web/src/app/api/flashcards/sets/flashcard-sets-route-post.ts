import { NextResponse } from "next/server";
import { invalidateFlashcardReadCaches } from "@/lib/domain-cache";
import { createFlashcardSetForUser } from "@/lib/flashcards";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";
import {
  FLASHCARD_SET_INVALID_PAYLOAD_ERROR,
  parseFlashcardSetCreatePayload,
  resolveFlashcardSetDetailResponse,
  resolveFlashcardSetInvalidateEventPayload,
} from "./flashcard-sets-route-model";

export async function handleFlashcardSetsRoutePost(input: {
  request: Request;
  userId: string;
  workspaceId: string;
}) {
  const payload = await input.request.json().catch(() => ({}));
  const parsed = parseFlashcardSetCreatePayload(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: FLASHCARD_SET_INVALID_PAYLOAD_ERROR },
      { status: 400 }
    );
  }

  const set = await createFlashcardSetForUser({
    description: parsed.data.description,
    tags: parsed.data.tags,
    title: parsed.data.title,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  if (!set) {
    return NextResponse.json(
      { error: "Unable to create mindset set." },
      { status: 400 }
    );
  }

  await invalidateFlashcardReadCaches(input.workspaceId);

  void publishWorkspaceStreamEvent({
    payload: resolveFlashcardSetInvalidateEventPayload({
      action: "created",
      setId: set.id,
      workspaceUuid: input.workspaceId,
    }),
    type: "flashcards.invalidate",
    workspaceUuid: input.workspaceId,
  });

  return NextResponse.json(resolveFlashcardSetDetailResponse({ set }), {
    status: 201,
  });
}
