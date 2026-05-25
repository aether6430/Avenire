import { z } from "zod";

const requiredTrimmedString = () =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }
    return value.trim();
  }, z.string().min(1));

const optionalTrimmedNullableString = () =>
  z.preprocess((value) => {
    if (value === null) {
      return null;
    }
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, z.string().nullable().optional());

const optionalTrimmedTags = z.preprocess((value) => {
  if (typeof value === "undefined") {
    return undefined;
  }
  if (!Array.isArray(value)) {
    return value;
  }
  return value.map((tag) => (typeof tag === "string" ? tag.trim() : tag));
}, z.array(z.string().max(60)).max(12).optional());

const flashcardSetCardCreatePayloadSchema = z.object({
  backMarkdown: requiredTrimmedString(),
  frontMarkdown: requiredTrimmedString(),
  notesMarkdown: optionalTrimmedNullableString(),
  source: z
    .object({
      concept: requiredTrimmedString(),
      subject: requiredTrimmedString(),
      topic: requiredTrimmedString(),
    })
    .passthrough(),
  tags: optionalTrimmedTags.transform((value) => value?.filter(Boolean) ?? []),
});

export const FLASHCARD_SET_CARD_INVALID_PAYLOAD_ERROR =
  "frontMarkdown, backMarkdown, and source with subject, topic, and concept are required";
export const FLASHCARD_SET_CARD_CREATE_ERROR =
  "Unable to create Mindset Set card.";

export function parseFlashcardSetCardCreatePayload(payload: unknown) {
  return flashcardSetCardCreatePayloadSchema.safeParse(payload);
}

export function normalizeFlashcardSetId(setId: string) {
  return setId.trim();
}

export function resolveFlashcardSetCardInvalidateEventPayload(input: {
  cardId: string;
  setId: string;
  workspaceUuid: string;
}) {
  return {
    action: "created" as const,
    cardId: input.cardId,
    setId: input.setId,
    workspaceUuid: input.workspaceUuid,
  };
}

export function resolveFlashcardSetCardRouteError(
  error: unknown,
  fallback: string
) {
  return error instanceof Error ? error.message : fallback;
}
