import { z } from "zod";

const trimmedString = () =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }
    return value.trim();
  }, z.string());

const requiredTrimmedString = () => trimmedString().pipe(z.string().min(1));

const optionalTrimmedString = () =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }
    return value.trim();
  }, z.string().optional());

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

const flashcardCardUpdatePayloadSchema = z.object({
  backMarkdown: optionalTrimmedString(),
  frontMarkdown: optionalTrimmedString(),
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

export const FLASHCARD_CARD_INVALID_PAYLOAD_ERROR =
  "source with subject, topic, and concept is required for flashcard update";

export function parseFlashcardCardUpdatePayload(payload: unknown) {
  return flashcardCardUpdatePayloadSchema.safeParse(payload);
}

export function normalizeFlashcardCardId(cardId: string) {
  return cardId.trim();
}

export function resolveFlashcardCardInvalidateEventPayload(input: {
  action: "updated" | "deleted";
  cardId: string;
  setId: string;
  workspaceUuid: string;
}) {
  return {
    action: input.action,
    cardId: input.cardId,
    setId: input.setId,
    workspaceUuid: input.workspaceUuid,
  };
}
