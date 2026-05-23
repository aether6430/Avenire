import { z } from "zod";

const FLASHCARDS_ONBOARDING_DEFAULT_CARD_COUNT = 5;
const FLASHCARDS_ONBOARDING_MAX_CARD_COUNT = 12;
export const FLASHCARDS_ONBOARDING_ERROR = "Unable to generate mindset.";

const requiredTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }
    return value.trim();
  }, z.string().min(1).max(maxLength));

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().min(1).max(maxLength).optional());

const flashcardsOnboardingGenerationCardSchema = z.object({
  backMarkdown: requiredTrimmedString(10_000),
  frontMarkdown: requiredTrimmedString(10_000),
  notesMarkdown: optionalTrimmedString(10_000).nullable().optional(),
  tags: z.array(requiredTrimmedString(120)).max(12).optional(),
});

export const flashcardsOnboardingGenerationSchema = z.object({
  cards: z
    .array(flashcardsOnboardingGenerationCardSchema)
    .min(1)
    .max(FLASHCARDS_ONBOARDING_MAX_CARD_COUNT),
  title: requiredTrimmedString(200),
});

const flashcardsOnboardingRequestSchema = z.object({
  concept: requiredTrimmedString(200),
  count: z
    .number()
    .int()
    .min(1)
    .max(FLASHCARDS_ONBOARDING_MAX_CARD_COUNT)
    .optional(),
  reason: requiredTrimmedString(500),
  subject: requiredTrimmedString(120),
  title: optionalTrimmedString(200),
  topic: requiredTrimmedString(160),
});

export type FlashcardsOnboardingPayload = z.infer<
  typeof flashcardsOnboardingRequestSchema
>;

export type FlashcardsOnboardingGeneratedDeck = z.infer<
  typeof flashcardsOnboardingGenerationSchema
>;

export interface FlashcardsOnboardingResponse {
  cards: Array<{
    backMarkdown: string;
    frontMarkdown: string;
    id: string;
    notesMarkdown: string | null;
    tags: string[];
  }>;
  set: {
    id: string;
    title: string;
  };
}

export function parseFlashcardsOnboardingPayload(payload: unknown) {
  return flashcardsOnboardingRequestSchema.safeParse(payload);
}

export function buildFlashcardsOnboardingStudySource(
  input: FlashcardsOnboardingPayload
) {
  return [
    `Concept: ${input.concept}`,
    `Subject: ${input.subject}`,
    `Topic: ${input.topic}`,
    `Reason: ${input.reason}`,
    "Generate cards for a Mindset Set that confront the wrong model, then teach the correct one.",
    "Keep the cards concise, specific, and directly useful for review.",
  ].join("\n");
}

export function buildFlashcardsOnboardingPrompt(input: {
  count?: number;
  source: string;
  title?: string;
}) {
  const cardCount = Math.max(
    1,
    Math.min(
      input.count ?? FLASHCARDS_ONBOARDING_DEFAULT_CARD_COUNT,
      FLASHCARDS_ONBOARDING_MAX_CARD_COUNT
    )
  );
  const titleHint = input.title ?? "Concept correction";

  return [
    "Create a clean Mindset Set from the misconception source.",
    `Return exactly ${cardCount} cards.`,
    "Use markdown for front and back content.",
    "Make the Mindset Set practical for a student reviewing the concept.",
    "Avoid fluff and avoid duplicate cards.",
    `Mindset title hint: ${titleHint}`,
    `Source material:\n${input.source}`,
  ].join("\n\n");
}

export function resolveFlashcardsOnboardingResponse(
  response: FlashcardsOnboardingResponse
) {
  return response;
}

export function resolveFlashcardsOnboardingRouteError(
  error: unknown,
  fallback: string
) {
  return error instanceof Error ? error.message : fallback;
}
