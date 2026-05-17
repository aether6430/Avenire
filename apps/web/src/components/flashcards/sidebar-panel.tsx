"use client";

import type { FlashcardsSidebarPanelProps } from "@/components/flashcards/flashcards-sidebar-panel-model";
import { FlashcardsSidebarPanelSurface } from "@/components/flashcards/flashcards-sidebar-panel-surface";
import { useFlashcardsSidebarPanel } from "@/components/flashcards/use-flashcards-sidebar-panel";

export function FlashcardsSidebarPanel(props: FlashcardsSidebarPanelProps) {
  const runtime = useFlashcardsSidebarPanel(props);

  return <FlashcardsSidebarPanelSurface runtime={runtime} />;
}
