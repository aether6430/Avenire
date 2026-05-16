import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FlashcardsDashboardPanels } from "@/components/flashcards/flashcards-dashboard-panels";

describe("FlashcardsDashboardPanels", () => {
  it("uses the visible Mindset terminology in empty and selected deck states", () => {
    const emptyHtml = renderToStaticMarkup(
      <FlashcardsDashboardPanels
        runtime={{
          busy: false,
          createOpen: false,
          createSet: async () => {},
          createStatus: null,
          dashboard: {
            cardSnapshots: [],
            dueCount: 0,
            newCount: 0,
            reviewCount7d: 0,
            reviewCountToday: 0,
            sets: [],
            stateCounts: {},
          } as never,
          description: "",
          generationError: null,
          generationLoading: false,
          isMobile: false,
          openReviewTarget: () => {},
          openSet: () => {},
          orderedSets: [],
          prefetchSet: () => {},
          reviewTarget: null,
          selectedSet: null,
          selectedSetId: null,
          selectedSnapshots: [],
          setCreateOpen: () => {},
          setDescription: () => {},
          setSelectedSetId: () => {},
          setTags: () => {},
          setTitle: () => {},
          tags: "",
          title: "",
        }}
      />
    );

    expect(emptyHtml).toContain("No mindset sets yet");
    expect(emptyHtml).not.toContain("No flashcard sets yet");
    expect(emptyHtml).toContain("Mindset Sets");
    expect(emptyHtml).not.toContain("Decks");
    expect(emptyHtml).toContain("Select a mindset set to keep going.");
    expect(emptyHtml).not.toContain("Nothing to show yet.");

    const selectedHtml = renderToStaticMarkup(
      <FlashcardsDashboardPanels
        runtime={{
          busy: false,
          createOpen: false,
          createSet: async () => {},
          createStatus: null,
          dashboard: {
            cardSnapshots: [],
            dueCount: 0,
            newCount: 0,
            reviewCount7d: 0,
            reviewCountToday: 0,
            sets: [],
            stateCounts: {},
          } as never,
          description: "",
          generationError: null,
          generationLoading: false,
          isMobile: false,
          openReviewTarget: () => {},
          openSet: () => {},
          orderedSets: [],
          prefetchSet: () => {},
          reviewTarget: null,
          selectedSet: {
            cardCount: 12,
            description: null,
            dueCount: 0,
            enrollmentStatus: "active",
            id: "set-1",
            lastStudiedAt: null,
            newCount: 0,
            reviewCount7d: 0,
            reviewCountToday: 0,
            sourceType: "ai-generated",
            sourceChatSlug: null,
            tags: [],
            title: "Electrostatics",
            updatedAt: "2026-05-15T10:00:00.000Z",
            workspaceId: "workspace-1",
          } as never,
          selectedSetId: "set-1",
          selectedSnapshots: [],
          setCreateOpen: () => {},
          setDescription: () => {},
          setSelectedSetId: () => {},
          setTags: () => {},
          setTitle: () => {},
          tags: "",
          title: "",
        }}
      />
    );

    expect(selectedHtml).toContain("Mindset Set Profile");
    expect(selectedHtml).not.toContain("Deck profile");
    expect(selectedHtml).toContain("No cards tracked for this mindset yet.");
    expect(selectedHtml).not.toContain("No cards tracked for this deck yet.");
    expect(selectedHtml).toContain("Open mindset set");
    expect(selectedHtml).not.toContain("Open deck");
  });
});
