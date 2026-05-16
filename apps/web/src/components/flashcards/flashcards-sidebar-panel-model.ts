import type { FlashcardSetSummary } from "@/lib/flashcards";

export interface FlashcardsSidebarPanelProps {
  active: boolean;
  activeSetId?: string;
  workspaceUuid?: string | null;
}

export function findFlashcardsSidebarReviewTarget(
  sets: FlashcardSetSummary[]
): FlashcardSetSummary | null {
  return sets.find((set) => set.dueCount > 0 || set.newCount > 0) ?? null;
}

export function filterFlashcardsSidebarSets(
  sets: FlashcardSetSummary[],
  searchQuery: string
) {
  const needle = searchQuery.trim().toLowerCase();
  if (!needle) {
    return sets;
  }

  return sets.filter((set) =>
    `${set.title} ${set.description ?? ""} ${set.tags.join(" ")}`
      .toLowerCase()
      .includes(needle)
  );
}

export function getFlashcardsSidebarSetsState(input: {
  filteredSetCount: number;
  loadFailed: boolean;
  loading: boolean;
  totalSetCount: number;
}) {
  if (input.loading && input.totalSetCount === 0) {
    return {
      description: "Mindset sets are still loading.",
      title: "Loading mindset sets...",
    };
  }

  if (input.loadFailed && input.totalSetCount === 0) {
    return {
      description: "Try again in a moment to reload your mindset sets.",
      title: "Unable to load mindset sets.",
    };
  }

  if (input.totalSetCount === 0) {
    return {
      description: "Create a mindset set to start studying.",
      title: "No mindset sets yet",
    };
  }

  if (input.filteredSetCount === 0) {
    return {
      description:
        "Try a shorter search or clear the filters to reveal more mindset sets.",
      title: "No matching mindset sets",
    };
  }

  return null;
}
