import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dashboardSurfaceFile = path.resolve(
  import.meta.dirname,
  "./flashcards-dashboard-surface.tsx"
);
const workspacePageClientFile = path.resolve(
  import.meta.dirname,
  "./workspace-flashcards-page-client.tsx"
);
const workspaceFlashcardsPageFile = path.resolve(
  import.meta.dirname,
  "../../app/workspace/flashcards/page.tsx"
);
const setDetailSurfaceFile = path.resolve(
  import.meta.dirname,
  "./flashcard-set-detail-surface.tsx"
);
const setDetailClientFile = path.resolve(
  import.meta.dirname,
  "./flashcard-set-detail-client.ts"
);
const setDetailStudyHookFile = path.resolve(
  import.meta.dirname,
  "./use-flashcard-set-detail-study.tsx"
);
const setDetailPageFile = path.resolve(
  import.meta.dirname,
  "./set-detail-page.tsx"
);
const flashcardSetsRouteModelFile = path.resolve(
  import.meta.dirname,
  "../../app/api/flashcards/sets/flashcard-sets-route-model.ts"
);
const flashcardDashboardRouteModelFile = path.resolve(
  import.meta.dirname,
  "../../app/api/flashcards/dashboard/flashcard-dashboard-route-model.ts"
);
const flashcardSetCardsRouteModelFile = path.resolve(
  import.meta.dirname,
  "../../app/api/flashcards/sets/[setId]/cards/flashcard-set-cards-route-model.ts"
);
const flashcardSetEnrollmentRouteModelFile = path.resolve(
  import.meta.dirname,
  "../../app/api/flashcards/sets/[setId]/enrollment/flashcard-set-enrollment-route-model.ts"
);

describe("flashcards surface language", () => {
  it("uses explicit collection and item wording across dashboard and detail surfaces", () => {
    const dashboardSurfaceSource = readFileSync(dashboardSurfaceFile, "utf8");
    const workspacePageClientSource = readFileSync(
      workspacePageClientFile,
      "utf8"
    );
    const workspaceFlashcardsPageSource = readFileSync(
      workspaceFlashcardsPageFile,
      "utf8"
    );
    const setDetailSurfaceSource = readFileSync(setDetailSurfaceFile, "utf8");
    const setDetailClientSource = readFileSync(setDetailClientFile, "utf8");
    const setDetailStudyHookSource = readFileSync(
      setDetailStudyHookFile,
      "utf8"
    );
    const setDetailPageSource = readFileSync(setDetailPageFile, "utf8");
    const flashcardSetsRouteModelSource = readFileSync(
      flashcardSetsRouteModelFile,
      "utf8"
    );
    const flashcardDashboardRouteModelSource = readFileSync(
      flashcardDashboardRouteModelFile,
      "utf8"
    );
    const flashcardSetCardsRouteModelSource = readFileSync(
      flashcardSetCardsRouteModelFile,
      "utf8"
    );
    const flashcardSetEnrollmentRouteModelSource = readFileSync(
      flashcardSetEnrollmentRouteModelFile,
      "utf8"
    );

    expect(dashboardSurfaceSource).toContain("Generating Mindset Set");
    expect(dashboardSurfaceSource).toContain("Go to Mindset Set");
    expect(dashboardSurfaceSource).not.toContain("Generating mindset\n");
    expect(dashboardSurfaceSource).not.toContain(
      "Select a Mindset Set, check what is coming up, then jump straight into review."
    );

    expect(workspacePageClientSource).toContain("Unable to load Mindset Sets.");
    expect(workspacePageClientSource).not.toContain(
      "Unable to load mindset sets dashboard."
    );
    expect(workspaceFlashcardsPageSource).toContain(
      'label="Loading Mindset Sets..."'
    );
    expect(workspaceFlashcardsPageSource).not.toContain(
      'label="Loading mindset sets..."'
    );

    expect(setDetailSurfaceSource).toContain("Mindset Set");
    expect(setDetailSurfaceSource).toContain(
      "No description set for this Mindset Set."
    );
    expect(setDetailSurfaceSource).toContain("reviews in 7d");
    expect(setDetailSurfaceSource).toContain("Not studied yet");
    expect(setDetailSurfaceSource).not.toContain(
      "No description set for this mindset."
    );
    expect(setDetailSurfaceSource).not.toContain("Mindset Set Profile");
    expect(setDetailSurfaceSource).not.toContain("Study context");
    expect(setDetailSurfaceSource).not.toContain("Mindset profile");

    expect(setDetailPageSource).toContain("Mindset Set not found.");
    expect(setDetailPageSource).toContain("Unable to load Mindset Set.");
    expect(setDetailPageSource).toContain("Loading Mindset Set");
    expect(setDetailPageSource).toContain("Opening Mindset Set");
    expect(setDetailPageSource).toContain(
      "Try going back to the Mindset Sets list and opening it again."
    );
    expect(setDetailPageSource).not.toContain("Mindset set not found.");
    expect(setDetailPageSource).not.toContain("Unable to load mindset set.");
    expect(setDetailPageSource).not.toContain("Loading mindset set");
    expect(setDetailPageSource).not.toContain("Opening mindset set");
    expect(setDetailPageSource).not.toContain(
      "Try going back to the mindset sets list and opening it again."
    );

    expect(setDetailClientSource).toContain(
      'payload.error?.trim() || "Failed to load review queue"'
    );
    expect(setDetailClientSource).toContain(
      'payload.error?.trim() || "Failed to submit review"'
    );
    expect(setDetailStudyHookSource).toContain(
      'error instanceof Error\n          ? error.message\n          : "Unable to load this review session right now."'
    );
    expect(setDetailStudyHookSource).toContain(
      'error instanceof Error\n            ? error.message\n            : "We couldn\'t record that rating. Try again."'
    );

    expect(flashcardSetsRouteModelSource).toContain(
      "Invalid Mindset Set payload"
    );
    expect(flashcardSetsRouteModelSource).toContain(
      "Provide at least one Mindset Set field: title, description, tags"
    );
    expect(flashcardSetsRouteModelSource).toContain(
      "Unable to load Mindset Sets."
    );
    expect(flashcardSetsRouteModelSource).toContain(
      "Could not create the Mindset Set."
    );
    expect(flashcardSetsRouteModelSource).toContain(
      "Unable to load Mindset Set."
    );
    expect(flashcardSetsRouteModelSource).toContain(
      "Unable to update Mindset Set."
    );
    expect(flashcardSetsRouteModelSource).toContain(
      "Unable to delete Mindset Set."
    );
    expect(flashcardSetsRouteModelSource).not.toContain(
      "Invalid mindset set payload"
    );
    expect(flashcardSetsRouteModelSource).not.toContain(
      "Provide at least one mindset set field: title, description, tags"
    );
    expect(flashcardSetsRouteModelSource).not.toContain(
      "Unable to load mindset sets."
    );
    expect(flashcardSetsRouteModelSource).not.toContain(
      "Could not create the mindset set."
    );
    expect(flashcardSetsRouteModelSource).not.toContain(
      "Unable to load mindset set."
    );
    expect(flashcardSetsRouteModelSource).not.toContain(
      "Unable to update mindset set."
    );
    expect(flashcardSetsRouteModelSource).not.toContain(
      "Unable to delete mindset set."
    );

    expect(flashcardDashboardRouteModelSource).toContain(
      "Unable to load Mindset Sets dashboard."
    );
    expect(flashcardDashboardRouteModelSource).not.toContain(
      "Unable to load mindset sets dashboard."
    );

    expect(flashcardSetCardsRouteModelSource).toContain(
      "Unable to create Mindset Set card."
    );
    expect(flashcardSetCardsRouteModelSource).not.toContain(
      "Unable to create mindset set card."
    );

    expect(flashcardSetEnrollmentRouteModelSource).toContain(
      "Unable to update Mindset Set enrollment."
    );
    expect(flashcardSetEnrollmentRouteModelSource).not.toContain(
      "Unable to update mindset set enrollment."
    );
  });
});
