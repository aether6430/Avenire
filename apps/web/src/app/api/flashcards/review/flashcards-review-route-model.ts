import { z } from "zod";

const FLASHCARD_REVIEW_RATINGS = ["again", "hard", "good", "easy"] as const;

const requiredTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }
    return value.trim();
  }, z.string().min(1).max(maxLength));

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (value === null) {
      return null;
    }
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, z.string().max(maxLength).nullable().optional());

const flashcardsReviewPayloadSchema = z.object({
  answerText: optionalTrimmedString(10_000),
  cardId: requiredTrimmedString(200),
  rating: z.enum(FLASHCARD_REVIEW_RATINGS),
});

export const FLASHCARDS_REVIEW_INVALID_PAYLOAD_ERROR =
  "cardId and a valid rating are required";

export function parseFlashcardsReviewPayload(payload: unknown) {
  return flashcardsReviewPayloadSchema.safeParse(payload);
}

export function buildFlashcardsReviewInvalidateEventPayload(input: {
  cardId: string;
  workspaceUuid: string;
}) {
  return {
    action: "reviewed" as const,
    cardId: input.cardId,
    workspaceUuid: input.workspaceUuid,
  };
}
