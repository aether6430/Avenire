import {
  deriveFlashcardReviewLearningActions,
  subscribeFlashcardReviewEvents,
  type FlashcardReviewCommittedEvent,
} from "./flashcard-review-events";
import {
  listRecentCardRatings,
  listRecentConceptRatings,
  improveMisconceptionsForConcept,
  recomputeConceptMastery,
  resolveMisconceptionsForConcept,
  upsertMisconception,
} from "./learning-data";

let bootstrapRegistered = false;

async function handleFlashcardReviewEvent(
  event: FlashcardReviewCommittedEvent
) {
  if (!(event.concept && event.subject && event.topic)) {
    return;
  }

  const [recentCardRatings, recentConceptRatings] = await Promise.all([
    listRecentCardRatings({
      cardId: event.card.id,
      limit: 2,
      userId: event.userId,
    }),
    listRecentConceptRatings({
      concept: event.concept,
      limit: 3,
      subject: event.subject,
      topic: event.topic,
      userId: event.userId,
      workspaceId: event.workspaceId,
    }),
  ]);

  const actions = deriveFlashcardReviewLearningActions({
    event,
    recentCardRatings,
    recentConceptRatings,
  });

  if (actions.misconception) {
    await upsertMisconception({
      confidence: actions.misconception.confidence,
      concept: actions.misconception.concept,
      observedAt: new Date(actions.mastery?.reviewedAt ?? event.reviewedAt),
      reason: actions.misconception.reason,
      source: actions.misconception.source,
      subject: actions.misconception.subject ?? event.subject,
      topic: actions.misconception.topic ?? event.topic,
      userId: actions.misconception.userId,
      workspaceId: actions.misconception.workspaceId,
    });
  }

  if (event.rating === "good" || event.rating === "easy") {
    await improveMisconceptionsForConcept({
      concept: event.concept,
      observedAt: new Date(event.reviewedAt),
      subject: event.subject ?? undefined,
      topic: event.topic ?? undefined,
      userId: event.userId,
      workspaceId: event.workspaceId,
    });
  }

  if (actions.resolveMisconception) {
    await resolveMisconceptionsForConcept({
      concept: actions.resolveMisconception.concept,
      resolvedAt: new Date(actions.resolveMisconception.reviewedAt),
      subject: actions.resolveMisconception.subject ?? event.subject,
      topic: actions.resolveMisconception.topic ?? event.topic,
      userId: actions.resolveMisconception.userId,
      workspaceId: actions.resolveMisconception.workspaceId,
    });
  }

  if (actions.mastery) {
    await recomputeConceptMastery({
      concept: actions.mastery.concept,
      reviewedAt: new Date(actions.mastery.reviewedAt),
      subject: actions.mastery.subject ?? event.subject,
      topic: actions.mastery.topic ?? event.topic,
      userId: actions.mastery.userId,
      workspaceId: actions.mastery.workspaceId,
    });
  }
}

export function bootstrapFlashcardLearningAutomation() {
  if (bootstrapRegistered) {
    return;
  }

  bootstrapRegistered = true;
  subscribeFlashcardReviewEvents((event) => handleFlashcardReviewEvent(event));
}
