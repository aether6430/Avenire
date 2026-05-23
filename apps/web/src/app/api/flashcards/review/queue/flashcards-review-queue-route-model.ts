import type { FlashcardTaxonomy } from "@/lib/flashcards";

const FLASHCARDS_REVIEW_QUEUE_DEFAULT_LIMIT = 20;
const FLASHCARDS_REVIEW_QUEUE_MAX_LIMIT = 100;
export const FLASHCARDS_REVIEW_QUEUE_LOAD_ERROR = "Failed to load review queue";

function clampReviewQueueLimit(raw: string | null) {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return FLASHCARDS_REVIEW_QUEUE_DEFAULT_LIMIT;
  }
  return Math.max(1, Math.min(parsed, FLASHCARDS_REVIEW_QUEUE_MAX_LIMIT));
}

function parseFlashcardsReviewQueueDrillFilters(
  searchParams: URLSearchParams
): FlashcardTaxonomy[] {
  return searchParams.getAll("drill").flatMap((value) => {
    try {
      const parsed = JSON.parse(value) as Partial<FlashcardTaxonomy>;
      if (
        typeof parsed.subject !== "string" ||
        typeof parsed.topic !== "string" ||
        typeof parsed.concept !== "string"
      ) {
        return [];
      }

      const subject = parsed.subject.trim();
      const topic = parsed.topic.trim();
      const concept = parsed.concept.trim();
      if (!(subject && topic && concept)) {
        return [];
      }

      return [
        {
          concept,
          subject,
          topic,
        },
      ];
    } catch {
      return [];
    }
  });
}

export function parseFlashcardsReviewQueueRequest(requestUrl: string) {
  const { searchParams } = new URL(requestUrl);
  const setId = searchParams.get("setId")?.trim() || undefined;
  const taxonomyFilters = parseFlashcardsReviewQueueDrillFilters(searchParams);

  return {
    limit: clampReviewQueueLimit(searchParams.get("limit")),
    setId,
    taxonomyFilters,
  };
}

export function resolveFlashcardsReviewQueueResponse(input: {
  queue: unknown[];
}) {
  return input;
}

export function resolveFlashcardsReviewQueueRouteError(
  error: unknown,
  fallback: string
) {
  return error instanceof Error ? error.message : fallback;
}
