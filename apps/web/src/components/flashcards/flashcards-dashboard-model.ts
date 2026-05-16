import type { FlashcardDashboardRecord } from "@/lib/flashcards";

export interface FlashcardGenerationRequest {
  concept: string;
  count: number;
  reason: string;
  subject: string;
  title?: string;
  topic: string;
}

export interface FlashcardsDashboardProps {
  generationRequest: FlashcardGenerationRequest | null;
  initialDashboard: FlashcardDashboardRecord;
}

export function getFlashcardEnrollmentLabel(
  status: FlashcardDashboardRecord["sets"][number]["enrollmentStatus"]
) {
  if (status === "active") {
    return "Study active";
  }

  if (status === "paused") {
    return "Paused";
  }

  return "Not enrolled";
}

export function buildOrderedFlashcardSets(dashboard: FlashcardDashboardRecord) {
  return dashboard.sets.slice().sort((left, right) => {
    const pressureDiff =
      right.dueCount + right.newCount - (left.dueCount + left.newCount);

    if (pressureDiff !== 0) {
      return pressureDiff;
    }

    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  });
}

export function findFlashcardsReviewTarget(
  orderedSets: FlashcardDashboardRecord["sets"]
) {
  return (
    orderedSets.find((set) => set.dueCount > 0 || set.newCount > 0) ?? null
  );
}

export function findSelectedFlashcardSet(input: {
  orderedSets: FlashcardDashboardRecord["sets"];
  selectedSetId: string | null;
}) {
  return (
    input.orderedSets.find(
      (candidate) => candidate.id === input.selectedSetId
    ) ?? null
  );
}

export function findSelectedFlashcardSnapshots(input: {
  dashboard: FlashcardDashboardRecord;
  selectedSetId: string | null;
}) {
  return input.dashboard.cardSnapshots.filter(
    (snapshot) => snapshot.card.setId === input.selectedSetId
  );
}

export function buildFlashcardSetTags(tags: string) {
  return tags
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
