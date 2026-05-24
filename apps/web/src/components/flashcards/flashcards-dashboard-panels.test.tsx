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
  resolve(import.meta.dirname, "./workspace-flashcards-page-client.tsx"),
  "utf8"
);
const flashcardsDashboardModelSource = readFileSync(
  resolve(import.meta.dirname, "./flashcards-dashboard-model.ts"),
  "utf8"
);

function createRuntime(overrides: Record<string, unknown> = {}) {
  return {
    activeMisconceptions: [],
    adjustMisconceptionConfidence: async () => {},
    busy: false,
    clearMisconception: async () => {},
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
    },
    description: "",
    generationError: null,
    generationLoading: false,
    isMobile: false,
    mindsetOverviewErrorMessage: null,
    mindsetOverviewLoading: false,
    openMisconceptionFlashcards: () => {},
    openMisconceptionTutor: () => {},
    openReviewTarget: () => {},
    openSet: () => {},
    orderedSets: [],
    prefetchSet: () => {},
    reviewTarget: null,
    selectedMisconception: null,
    selectedSet: null,
    selectedSetId: null,
    selectedSnapshots: [],
    setCreateOpen: () => {},
    setDescription: () => {},
    setSelectedMisconception: () => {},
    setSelectedSetId: () => {},
    setTags: () => {},
    setTitle: () => {},
    tags: "",
    title: "",
    ...overrides,
  } as never;
}

describe("FlashcardsDashboardPanels", () => {
  it("uses the visible Mindset terminology in empty and selected deck states", () => {
    const emptyHtml = renderToStaticMarkup(
      <FlashcardsDashboardPanels runtime={createRuntime()} />
    );

    expect(emptyHtml).toContain("No Mindset Sets yet");
    expect(emptyHtml).not.toContain("No flashcard sets yet");
    expect(emptyHtml).toContain("Mindset Sets");
    expect(emptyHtml).toContain('data-slot="empty"');
    expect(emptyHtml).not.toContain("Decks");
    expect(emptyHtml).toContain("Select a Mindset Set to keep going.");
    expect(emptyHtml).not.toContain("Nothing to show yet.");

    const selectedHtml = renderToStaticMarkup(
      <FlashcardsDashboardPanels
        runtime={createRuntime({
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
          },
          selectedSetId: "set-1",
          selectedSnapshots: [],
        })}
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

  it("renders stability curves for reviewed cards with FSRS stability data", () => {
    const html = renderToStaticMarkup(
      <FlashcardsDashboardPanels
        runtime={createRuntime({
          selectedSet: {
            cardCount: 1,
            description: "Reviewed set",
            dueCount: 1,
            enrollmentStatus: "active",
            id: "set-1",
            lastStudiedAt: "2026-05-20T10:00:00.000Z",
            newCount: 0,
            reviewCount7d: 3,
            reviewCountToday: 1,
            sourceChatSlug: null,
            sourceType: "ai-generated",
            tags: [],
            title: "Momentum",
            updatedAt: "2026-05-20T10:00:00.000Z",
            workspaceId: "workspace-1",
          },
          selectedSetId: "set-1",
          selectedSnapshots: [
            {
              archivedAt: null,
              card: {
                backMarkdown: "Impulse changes momentum.",
                createdAt: "2026-05-20T10:00:00.000Z",
                frontMarkdown: "What is impulse?",
                id: "card-1",
                kind: "flashcard",
                notesMarkdown: null,
                ordinal: 0,
                payload: {},
                setId: "set-1",
                source: {},
                tags: [],
                updatedAt: "2026-05-20T10:00:00.000Z",
              },
              displayState: "young",
              dueAt: "2099-05-21T10:00:00.000Z",
              reviewState: {
                createdAt: "2026-05-20T10:00:00.000Z",
                difficulty: 4.1,
                dueAt: "2099-05-21T10:00:00.000Z",
                elapsedDays: 3,
                flashcardId: "card-1",
                id: "review-1",
                lapses: 0,
                lastRating: "good",
                lastReviewedAt: "2026-05-20T10:00:00.000Z",
                reps: 4,
                scheduledDays: 28,
                schedulerVersion: 1,
                stability: 21,
                state: "review",
                suspended: false,
                updatedAt: "2026-05-20T10:00:00.000Z",
                userId: "user-1",
              },
            },
          ],
        })}
      />
    );

    expect(html).toContain("Stability curves");
    expect(html).toContain("FSRS retention estimate from reviewed cards.");
    expect(html).toContain("Median");
    expect(html).toContain("7d due");
    expect(html).toContain("Mature");
  });

  it("shows active misconception memory in the dashboard when misconceptions exist", () => {
    const html = renderToStaticMarkup(
      <FlashcardsDashboardPanels
        runtime={createRuntime({
          activeMisconceptions: [
            {
              active: true,
              blocks: null,
              confidence: 0.82,
              concept: "Impulse",
              createdAt: "2026-05-20T10:00:00.000Z",
              decayedAt: null,
              evidenceClass: "tool",
              evidenceCount: 1,
              evidenceRootId: null,
              evidenceSpan: null,
              firstSeenAt: "2026-05-20T10:00:00.000Z",
              id: "m-1",
              lastSeenAt: "2026-05-20T10:00:00.000Z",
              promotedAt: null,
              reason:
                "Treating impulse as the same thing as force over time without conservation context.",
              resolvedAt: null,
              source: "chat",
              sourceSessionId: null,
              status: "confirmed",
              subject: "Physics",
              topic: "Collisions",
              updatedAt: "2026-05-20T10:00:00.000Z",
              userId: "user-1",
              workspaceId: "workspace-1",
            },
          ],
        })}
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
        runtime={createRuntime({
          mindsetOverviewErrorMessage: "overview backend offline",
        })}
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
    expect(flashcardsDashboardPanelsSource).toContain("StabilityCurves");
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
      "FlashcardsDashboardMisconceptionDialog"
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
