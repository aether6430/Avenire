import {
  type ConceptMasteryRecord,
  type ConceptMasterySubjectRecord,
  type FlashcardDashboardRecord,
  type FlashcardTaxonomy,
  getFlashcardDashboardForUser as getFlashcardDashboardForUserRecord,
  getMasteryBySubject as getMasteryBySubjectRecord,
  getWeakestConcepts as getWeakestConceptsRecord,
  listDueFlashcardsForUser as listDueFlashcardsForUserRecord,
  listFlashcardDueCountsByDayForUser as listFlashcardDueCountsByDayForUserRecord,
  listFlashcardReviewCountsByDayForUser as listFlashcardReviewCountsByDayForUserRecord,
  listFlashcardSetSummariesForUser as listFlashcardSetSummariesForUserRecord,
  listMasterySubjectsForUser as listMasterySubjectsForUserRecord,
  normalizeFlashcardTaxonomy,
} from "@avenire/database";

export type {
  ConceptMasteryRecord,
  ConceptMasterySubjectRecord,
  FlashcardCardKind,
  FlashcardCardRecord,
  FlashcardCardSnapshot,
  FlashcardDashboardRecord,
  FlashcardDisplayState,
  FlashcardEnrollmentStatus,
  FlashcardRating,
  FlashcardReviewCountByDayRecord,
  FlashcardReviewEventRecord,
  FlashcardReviewLogRecord,
  FlashcardReviewQueueItem,
  FlashcardReviewStateRecord,
  FlashcardSetEnrollmentRecord,
  FlashcardSetRecord,
  FlashcardSetSummary,
  FlashcardSourceType,
  FlashcardStateCounts,
  FlashcardTaxonomy,
  ListDueFlashcardsForUserInput,
} from "@avenire/database";

// biome-ignore lint/performance/noBarrelFile: Thin app-layer re-export for flashcards APIs and types.
export {
  archiveFlashcardCardForUser,
  archiveFlashcardSetForUser,
  createFlashcardCardForUser,
  createFlashcardSetForUser,
  getFlashcardSetForUser,
  normalizeFlashcardTaxonomy,
  reviewFlashcardForUser,
  updateFlashcardCardForUser,
  updateFlashcardSetForUser,
  upsertFlashcardSetEnrollmentForUser,
} from "@avenire/database";

export interface ConceptDrillTarget {
  concepts: FlashcardTaxonomy[];
  matchedCardCount: number;
  matchedConceptCount: number;
  setId: string;
  setTitle: string;
  subject: string;
}

function taxonomyKey(
  taxonomy: Pick<FlashcardTaxonomy, "concept" | "subject" | "topic">
) {
  return `${taxonomy.subject}::${taxonomy.topic}::${taxonomy.concept}`;
}

export function getFlashcardDashboardForUser(
  userId: string,
  workspaceId: string
) {
  return getFlashcardDashboardForUserRecord(userId, workspaceId);
}

export function listFlashcardSetSummariesForUser(
  userId: string,
  workspaceId: string
) {
  return listFlashcardSetSummariesForUserRecord(userId, workspaceId);
}

export function listFlashcardReviewCountsByDayForUser(
  userId: string,
  workspaceId: string,
  since: Date
) {
  return listFlashcardReviewCountsByDayForUserRecord(
    userId,
    workspaceId,
    since
  );
}

export function listFlashcardDueCountsByDayForUser(
  userId: string,
  workspaceId: string,
  from: Date,
  to: Date
) {
  return listFlashcardDueCountsByDayForUserRecord(
    userId,
    workspaceId,
    from,
    to
  );
}

export function listDueFlashcardsForUser(
  input: Parameters<typeof listDueFlashcardsForUserRecord>[0]
) {
  return listDueFlashcardsForUserRecord(input);
}

export function getMasteryBySubject(
  userId: string,
  workspaceId: string,
  subject: string,
  limit = 36
) {
  return getMasteryBySubjectRecord({
    limit,
    subject,
    userId,
    workspaceId,
  });
}

export function getWeakestConcepts(
  userId: string,
  workspaceId: string,
  input: { limit?: number; subject?: string }
) {
  return getWeakestConceptsRecord({
    limit: input.limit,
    subject: input.subject,
    userId,
    workspaceId,
  });
}

export function listMasterySubjectsForUser(
  userId: string,
  workspaceId: string,
  limit = 12
) {
  return listMasterySubjectsForUserRecord({
    limit,
    userId,
    workspaceId,
  });
}

export async function getConceptMasteryDashboardData(
  userId: string,
  workspaceId: string,
  requestedSubject?: string | null
): Promise<{
  concepts: ConceptMasteryRecord[];
  selectedSubject: string | null;
  subjects: ConceptMasterySubjectRecord[];
  weakestConcepts: ConceptMasteryRecord[];
}> {
  const subjects = await listMasterySubjectsForUser(userId, workspaceId);
  const selectedSubject =
    subjects.find((subject) => subject.subject === requestedSubject)?.subject ??
    subjects[0]?.subject ??
    null;

  if (!selectedSubject) {
    return {
      concepts: [],
      selectedSubject: null,
      subjects,
      weakestConcepts: [],
    };
  }

  const [concepts, weakestConcepts] = await Promise.all([
    getMasteryBySubject(userId, workspaceId, selectedSubject),
    getWeakestConcepts(userId, workspaceId, {
      limit: 5,
      subject: selectedSubject,
    }),
  ]);

  return {
    concepts,
    selectedSubject,
    subjects,
    weakestConcepts,
  };
}

export function resolveWeakestConceptDrillTarget(
  dashboard: FlashcardDashboardRecord,
  weakestConcepts: ConceptMasteryRecord[],
  limit = 3
): ConceptDrillTarget | null {
  const requested = weakestConcepts
    .slice()
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      if (left.activeMisconceptionCount !== right.activeMisconceptionCount) {
        return right.activeMisconceptionCount - left.activeMisconceptionCount;
      }

      return taxonomyKey(left).localeCompare(taxonomyKey(right));
    })
    .slice(0, Math.max(1, limit))
    .map((concept) => ({
      concept: concept.concept,
      subject: concept.subject,
      topic: concept.topic,
    }));

  if (requested.length === 0) {
    return null;
  }

  const requestedKeys = new Set(requested.map(taxonomyKey));
  const candidates = new Map<
    string,
    {
      conceptKeys: Set<string>;
      matchedCardCount: number;
      matchedConcepts: FlashcardTaxonomy[];
      setTitle: string;
    }
  >();

  for (const snapshot of dashboard.cardSnapshots) {
    if (
      snapshot.displayState === "killed" ||
      snapshot.displayState === "suspended"
    ) {
      continue;
    }

    const taxonomy = normalizeFlashcardTaxonomy(snapshot.card.source);
    if (!(taxonomy && requestedKeys.has(taxonomyKey(taxonomy)))) {
      continue;
    }

    const existing = candidates.get(snapshot.card.setId) ?? {
      conceptKeys: new Set<string>(),
      matchedCardCount: 0,
      matchedConcepts: [],
      setTitle:
        dashboard.sets.find((set) => set.id === snapshot.card.setId)?.title ??
        "Untitled Set",
    };
    const key = taxonomyKey(taxonomy);
    if (!existing.conceptKeys.has(key)) {
      existing.conceptKeys.add(key);
      existing.matchedConcepts.push(taxonomy);
    }
    existing.matchedCardCount += 1;
    candidates.set(snapshot.card.setId, existing);
  }

  const best = Array.from(candidates.entries()).sort((left, right) => {
    const leftValue = left[1];
    const rightValue = right[1];

    if (leftValue.conceptKeys.size !== rightValue.conceptKeys.size) {
      return rightValue.conceptKeys.size - leftValue.conceptKeys.size;
    }

    if (leftValue.matchedCardCount !== rightValue.matchedCardCount) {
      return rightValue.matchedCardCount - leftValue.matchedCardCount;
    }

    return leftValue.setTitle.localeCompare(rightValue.setTitle);
  })[0];

  if (!best) {
    return null;
  }

  const [setId, match] = best;

  return {
    concepts: match.matchedConcepts
      .slice()
      .sort((left, right) =>
        taxonomyKey(left).localeCompare(taxonomyKey(right))
      ),
    matchedCardCount: match.matchedCardCount,
    matchedConceptCount: match.conceptKeys.size,
    setId,
    setTitle: match.setTitle,
    subject:
      match.matchedConcepts[0]?.subject ?? weakestConcepts[0]?.subject ?? "",
  };
}
