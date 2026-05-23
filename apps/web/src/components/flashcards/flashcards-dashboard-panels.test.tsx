import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FlashcardsDashboardPanels } from "@/components/flashcards/flashcards-dashboard-panels";

const flashcardsDashboardPanelsSource = readFileSync(
  resolve(import.meta.dirname, "./flashcards-dashboard-panels.tsx"),
  "utf8"
);
const flashcardsDashboardSurfaceSource = readFileSync(
  resolve(import.meta.dirname, "./flashcards-dashboard-surface.tsx"),
  "utf8"
);
const flashcardsDashboardModelSource = readFileSync(
  resolve(import.meta.dirname, "./flashcards-dashboard-model.ts"),
  "utf8"
);

describe("FlashcardsDashboardPanels", () => {
  it("uses the visible Mindset terminology in empty and selected deck states", () => {
    const emptyHtml = renderToStaticMarkup(
      <FlashcardsDashboardPanels
        runtime={{
          activeMisconceptions: [],
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
          mindsetOverviewErrorMessage: null,
          mindsetOverviewLoading: false,
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

    expect(emptyHtml).toContain("No Mindset Sets yet");
    expect(emptyHtml).not.toContain("No flashcard sets yet");
    expect(emptyHtml).toContain("Mindset Sets");
    expect(emptyHtml).not.toContain("Decks");
    expect(emptyHtml).toContain("Select a Mindset Set to keep going.");
    expect(emptyHtml).not.toContain("Nothing to show yet.");

    const selectedHtml = renderToStaticMarkup(
      <FlashcardsDashboardPanels
        runtime={{
          activeMisconceptions: [],
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
          mindsetOverviewErrorMessage: null,
          mindsetOverviewLoading: false,
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

    expect(selectedHtml).not.toContain("Mindset Set Profile");
    expect(selectedHtml).not.toContain("Study context");
    expect(selectedHtml).toContain("0 studied today");
    expect(selectedHtml).toContain("0 reviews in 7d");
    expect(selectedHtml).toContain("Not studied yet");
    expect(selectedHtml).toContain(
      "No cards tracked for this Mindset Set yet."
    );
    expect(selectedHtml).not.toContain("No cards tracked for this deck yet.");
    expect(selectedHtml).toContain("Open Mindset Set");
    expect(selectedHtml).not.toContain("Open deck");
  });

  it("shows active misconception memory in the dashboard when misconceptions exist", () => {
    const html = renderToStaticMarkup(
      <FlashcardsDashboardPanels
        runtime={{
          activeMisconceptions: [
            {
              confidence: 0.82,
              concept: "Impulse",
              id: "m-1",
              reason:
                "Treating impulse as the same thing as force over time without conservation context.",
              source: "chat",
              subject: "Physics",
              topic: "Collisions",
            },
          ],
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
          mindsetOverviewErrorMessage: null,
          mindsetOverviewLoading: false,
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

    expect(html).toContain("Misconceptions");
    expect(html).toContain("1 active");
    expect(html).toContain("Impulse");
    expect(html).toContain("Physics / Collisions");
    expect(html).toContain("82%");
    expect(html).toContain("chat");
  });

  it("surfaces explicit misconception-memory errors instead of pretending there are no active misconceptions yet", () => {
    const html = renderToStaticMarkup(
      <FlashcardsDashboardPanels
        runtime={{
          activeMisconceptions: [],
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
          mindsetOverviewErrorMessage: "overview backend offline",
          mindsetOverviewLoading: false,
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

    expect(html).toContain("overview backend offline");
    expect(html).not.toContain("No active misconceptions yet.");
  });

  it("keeps dashboard panels focused on deck/misconception presentation while surface/header and pure ordering helpers stay separate", () => {
    expect(flashcardsDashboardPanelsSource).toContain(
      "FlashcardsDashboardDeckList"
    );
    expect(flashcardsDashboardPanelsSource).toContain(
      "FlashcardsDashboardSelectedDeck"
    );
    expect(flashcardsDashboardPanelsSource).toContain(
      "getFlashcardEnrollmentLabel"
    );
    expect(flashcardsDashboardPanelsSource).not.toContain("HeaderTitle");
    expect(flashcardsDashboardPanelsSource).not.toContain("useQuery");
    expect(flashcardsDashboardPanelsSource).not.toContain(
      "buildOrderedFlashcardSets("
    );

    expect(flashcardsDashboardSurfaceSource).toContain("HeaderTitle");
    expect(flashcardsDashboardSurfaceSource).toContain(
      "FlashcardsDashboardCreateDialog"
    );
    expect(flashcardsDashboardSurfaceSource).toContain(
      "FlashcardsDashboardPanels"
    );

    expect(flashcardsDashboardModelSource).toContain(
      "export function buildOrderedFlashcardSets"
    );
    expect(flashcardsDashboardModelSource).toContain(
      "export function findSelectedFlashcardSnapshots"
    );
    expect(flashcardsDashboardModelSource).not.toContain("fetch(");
  });
});
