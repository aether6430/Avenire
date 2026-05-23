import { NextResponse } from "next/server";
import { invalidateFlashcardReadCaches } from "@/lib/domain-cache";
import { upsertFlashcardSetEnrollmentForUser } from "@/lib/flashcards";
import {
  FLASHCARD_SET_ENROLLMENT_INVALID_PAYLOAD_ERROR,
  FLASHCARD_SET_ENROLLMENT_UPDATE_ERROR,
  normalizeFlashcardSetId,
  parseFlashcardSetEnrollmentPayload,
  resolveFlashcardSetEnrollmentRouteError,
} from "./flashcard-set-enrollment-route-model";

export async function handleFlashcardSetEnrollmentRoutePost(input: {
  request: Request;
  setId: string;
  userId: string;
  workspaceId: string;
}) {
  try {
    const payload = await input.request.json().catch(() => ({}));
    const parsed = parseFlashcardSetEnrollmentPayload(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: FLASHCARD_SET_ENROLLMENT_INVALID_PAYLOAD_ERROR },
        { status: 400 }
      );
    }

    const setId = normalizeFlashcardSetId(input.setId);
    const enrollment = await upsertFlashcardSetEnrollmentForUser({
      newCardsPerDay: parsed.data.newCardsPerDay,
      setId,
      status: parsed.data.status,
      userId: input.userId,
      workspaceId: input.workspaceId,
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    await invalidateFlashcardReadCaches(input.workspaceId);

    return NextResponse.json({ enrollment });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardSetEnrollmentRouteError(
          error,
          FLASHCARD_SET_ENROLLMENT_UPDATE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
