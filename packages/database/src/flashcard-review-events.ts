import type {
  FlashcardCardRecord,
  FlashcardSourceType,
} from "./flashcard-data";
import type { FlashcardRating, FlashcardReviewStateName } from "./flashcard-fsrs";

export interface FlashcardSourceTaxonomy {
  concept: string | null;
  subject: string | null;
  topic: string | null;
}

export interface FlashcardReviewEventSetSnapshot {
  id: string;
  sourceType: FlashcardSourceType;
  title: string;
  workspaceId: string;
}

export interface FlashcardReviewCommittedEvent {
  card: FlashcardCardRecord;
  concept: string | null;
  nextState: FlashcardReviewStateName;
  previousState: FlashcardReviewStateName | null;
  rating: FlashcardRating;
  reviewedAt: string;
  set: FlashcardReviewEventSetSnapshot;
  stability: number | null;
  subject: string | null;
  topic: string | null;
  userId: string;
  workspaceId: string;
}

export interface FlashcardMisconceptionSignal {
  confidence: number;
  concept: string;
  reason: string;
  source: "fsrs_signal";
  subject: string | null;
  topic: string | null;
  userId: string;
  workspaceId: string;
}

export interface FlashcardMasteryRecomputeSignal {
  concept: string;
  topic: string | null;
  subject: string | null;
  reviewedAt: string;
  userId: string;
  workspaceId: string;
}

export interface FlashcardReviewLearningActions {
  misconception: FlashcardMisconceptionSignal | null;
  mastery: FlashcardMasteryRecomputeSignal | null;
  resolveMisconception: FlashcardMasteryRecomputeSignal | null;
}

export type FlashcardReviewEventListener = (
  event: FlashcardReviewCommittedEvent
) => void | Promise<void>;

const listeners = new Set<FlashcardReviewEventListener>();

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readTaxonomyField(
  source: Record<string, unknown> | null | undefined,
  key: "subject" | "topic" | "concept"
): string | null {
  if (!(source && typeof source === "object")) {
    return null;
  }

  const direct = normalizeText(source[key]);
  if (direct) {
    return direct;
  }

  const nested = source.taxonomy;
  if (!(nested && typeof nested === "object" && !Array.isArray(nested))) {
    return null;
  }

  return normalizeText((nested as Record<string, unknown>)[key]);
}

export function extractFlashcardSourceTaxonomy(
  source: Record<string, unknown> | null | undefined
): FlashcardSourceTaxonomy {
  return {
    concept: readTaxonomyField(source, "concept"),
    subject: readTaxonomyField(source, "subject"),
    topic: readTaxonomyField(source, "topic"),
  };
}

export function createFlashcardReviewCommittedEvent(input: {
  card: FlashcardCardRecord;
  nextState: FlashcardReviewStateName;
  previousState: FlashcardReviewStateName | null;
  rating: FlashcardRating;
  reviewedAt: Date;
  set: FlashcardReviewEventSetSnapshot;
  stability: number | null;
  userId: string;
  workspaceId: string;
}): FlashcardReviewCommittedEvent {
  const taxonomy = extractFlashcardSourceTaxonomy(input.card.source);

  return {
    card: input.card,
    concept: taxonomy.concept,
    nextState: input.nextState,
    previousState: input.previousState,
    rating: input.rating,
    reviewedAt: input.reviewedAt.toISOString(),
    set: input.set,
    stability: input.stability,
    subject: taxonomy.subject,
    topic: taxonomy.topic,
    userId: input.userId,
    workspaceId: input.workspaceId,
  };
}

function isAgainStreak(ratings: FlashcardRating[]) {
  const [first, second] = ratings;
  return first === "again" && second === "again";
}

function isPositiveRating(rating: FlashcardRating) {
  return rating === "good" || rating === "easy";
}

export function deriveFlashcardReviewLearningActions(input: {
  event: FlashcardReviewCommittedEvent;
  recentCardRatings: FlashcardRating[];
  recentConceptRatings: FlashcardRating[];
}): FlashcardReviewLearningActions {
  const hasCanonicalTaxonomy = Boolean(
    input.event.concept && input.event.subject && input.event.topic
  );
  const mastery = hasCanonicalTaxonomy
    ? {
        concept: input.event.concept as string,
        topic: input.event.topic,
        subject: input.event.subject,
        reviewedAt: input.event.reviewedAt,
        userId: input.event.userId,
        workspaceId: input.event.workspaceId,
      }
    : null;

  const misconception =
    hasCanonicalTaxonomy &&
    input.event.rating === "again" &&
    isAgainStreak(input.recentCardRatings)
      ? {
          confidence: 0.6,
          concept: input.event.concept as string,
          reason: "Repeated again reviews on the same card",
          source: "fsrs_signal" as const,
          subject: input.event.subject,
          topic: input.event.topic,
          userId: input.event.userId,
          workspaceId: input.event.workspaceId,
        }
      : null;

  const resolveMisconception =
    hasCanonicalTaxonomy &&
    input.recentConceptRatings.length >= 3 &&
    input.recentConceptRatings.slice(0, 3).every(isPositiveRating)
      ? {
          concept: input.event.concept as string,
          topic: input.event.topic,
          subject: input.event.subject,
          reviewedAt: input.event.reviewedAt,
          userId: input.event.userId,
          workspaceId: input.event.workspaceId,
        }
      : null;

  return {
    mastery,
    misconception,
    resolveMisconception,
  };
}

export function subscribeFlashcardReviewEvents(
  listener: FlashcardReviewEventListener
) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function emitFlashcardReviewEvent(
  event: FlashcardReviewCommittedEvent
) {
  for (const listener of listeners) {
    try {
      void Promise.resolve(listener(event)).catch((error) => {
        console.error("[database] flashcard review event listener failed", {
          error,
        });
      });
    } catch (error) {
      console.error("[database] flashcard review event listener failed", {
        error,
      });
    }
  }
}
