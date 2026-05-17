"use client";

import type { FlashcardsDashboardProps } from "@/components/flashcards/flashcards-dashboard-model";
import { FlashcardsDashboardSurface } from "@/components/flashcards/flashcards-dashboard-surface";
import { useFlashcardsDashboard } from "@/components/flashcards/use-flashcards-dashboard";

export function FlashcardsDashboard(props: FlashcardsDashboardProps) {
  const runtime = useFlashcardsDashboard(props);

  return <FlashcardsDashboardSurface runtime={runtime} />;
}
