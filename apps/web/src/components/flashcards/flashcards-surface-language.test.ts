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
const setDetailSurfaceFile = path.resolve(
  import.meta.dirname,
  "./flashcard-set-detail-surface.tsx"
);

describe("flashcards surface language", () => {
  it("uses explicit collection and item wording across dashboard and detail surfaces", () => {
    const dashboardSurfaceSource = readFileSync(dashboardSurfaceFile, "utf8");
    const workspacePageClientSource = readFileSync(
      workspacePageClientFile,
      "utf8"
    );
    const setDetailSurfaceSource = readFileSync(setDetailSurfaceFile, "utf8");

    expect(dashboardSurfaceSource).toContain("Generating mindset set");
    expect(dashboardSurfaceSource).not.toContain("Generating mindset\n");

    expect(workspacePageClientSource).toContain(
      "Unable to load mindset sets dashboard."
    );
    expect(workspacePageClientSource).not.toContain(
      "Unable to load mindset dashboard."
    );

    expect(setDetailSurfaceSource).toContain("Mindset Set");
    expect(setDetailSurfaceSource).toContain("Mindset Set Profile");
    expect(setDetailSurfaceSource).toContain(
      "No description set for this mindset set."
    );
    expect(setDetailSurfaceSource).not.toContain(
      "No description set for this mindset."
    );
    expect(setDetailSurfaceSource).not.toContain("Mindset profile");
  });
});
