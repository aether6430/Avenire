import { z } from "zod";

const flashcardSetEnrollmentPayloadSchema = z.object({
  newCardsPerDay: z.number().int().min(1).max(100).optional(),
  status: z.enum(["active", "paused"]).optional(),
});

export const FLASHCARD_SET_ENROLLMENT_INVALID_PAYLOAD_ERROR =
  "status must be active or paused and newCardsPerDay must be an integer between 1 and 100";

export function parseFlashcardSetEnrollmentPayload(payload: unknown) {
  return flashcardSetEnrollmentPayloadSchema.safeParse(payload);
}

export function normalizeFlashcardSetId(setId: string) {
  return setId.trim();
}
