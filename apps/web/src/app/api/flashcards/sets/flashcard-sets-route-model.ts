import { z } from "zod";

const optionalTrimmedDescription = z.preprocess((value) => {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 600) : null;
}, z.string().max(600).nullable().optional());

const optionalTrimmedTitle = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 160) : undefined;
}, z.string().max(160).optional());

const optionalTrimmedTags = z.preprocess((value) => {
  if (typeof value === "undefined") {
    return undefined;
  }
  if (!Array.isArray(value)) {
    return value;
  }
  return value.map((tag) => (typeof tag === "string" ? tag.trim() : tag));
}, z.array(z.string().max(60)).max(12).optional());

const flashcardSetCreatePayloadSchema = z.object({
  description: optionalTrimmedDescription,
  tags: optionalTrimmedTags.transform((value) => value?.filter(Boolean) ?? []),
  title: optionalTrimmedTitle,
});

const flashcardSetUpdatePayloadSchema = z
  .object({
    description: optionalTrimmedDescription,
    tags: optionalTrimmedTags.transform((value) =>
      typeof value === "undefined" ? undefined : value.filter(Boolean)
    ),
    title: optionalTrimmedTitle,
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.description !== undefined ||
      value.tags !== undefined
  );

export const FLASHCARD_SET_INVALID_PAYLOAD_ERROR =
  "Invalid Mindset Set payload";
export const FLASHCARD_SET_UPDATE_ERROR =
  "Provide at least one Mindset Set field: title, description, tags";
export const FLASHCARD_SET_LIST_LOAD_ERROR = "Unable to load Mindset Sets.";
export const FLASHCARD_SET_CREATE_ERROR = "Could not create the Mindset Set.";
export const FLASHCARD_SET_DETAIL_LOAD_ERROR = "Unable to load Mindset Set.";
export const FLASHCARD_SET_DETAIL_UPDATE_ERROR =
  "Unable to update Mindset Set.";
export const FLASHCARD_SET_DETAIL_DELETE_ERROR =
  "Unable to delete Mindset Set.";

export function parseFlashcardSetCreatePayload(payload: unknown) {
  return flashcardSetCreatePayloadSchema.safeParse(payload);
}

export function parseFlashcardSetUpdatePayload(payload: unknown) {
  return flashcardSetUpdatePayloadSchema.safeParse(payload);
}

export function resolveFlashcardSetListResponse(input: { sets: unknown[] }) {
  return input;
}

export function resolveFlashcardSetDetailResponse(input: { set: unknown }) {
  return input;
}

export function resolveFlashcardSetInvalidateEventPayload(input: {
  action: "created" | "updated" | "deleted";
  setId: string;
  workspaceUuid: string;
}) {
  return {
    action: input.action,
    setId: input.setId,
    workspaceUuid: input.workspaceUuid,
  };
}

export function resolveFlashcardSetsRouteError(
  error: unknown,
  fallback: string
) {
  return error instanceof Error ? error.message : fallback;
}
