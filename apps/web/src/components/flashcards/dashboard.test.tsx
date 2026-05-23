import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const {
  FlashcardsDashboardSurfaceMock,
  useFlashcardsDashboardMock,
  usePaneSearchParamsMock,
  useQueryMock,
  useWorkspaceBootstrapMock,
} = vi.hoisted(() => ({
  FlashcardsDashboardSurfaceMock: vi.fn(() => <div>FLASHCARDS_SURFACE</div>),
  useFlashcardsDashboardMock: vi.fn(),
  usePaneSearchParamsMock: vi.fn(),
  useQueryMock: vi.fn(),
  useWorkspaceBootstrapMock: vi.fn(),
}));

vi.mock("@/components/flashcards/flashcards-dashboard-surface", () => ({
  FlashcardsDashboardSurface: FlashcardsDashboardSurfaceMock,
}));

vi.mock("@/components/flashcards/use-flashcards-dashboard", () => ({
  useFlashcardsDashboard: useFlashcardsDashboardMock,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: useQueryMock,
}));

vi.mock("@/components/dashboard/workspace-bootstrap", () => ({
  useWorkspaceBootstrap: useWorkspaceBootstrapMock,
}));

vi.mock("@/components/dashboard/workspace-route-placeholder", () => ({
  WorkspaceRoutePlaceholder: () => <div>PLACEHOLDER</div>,
}));

vi.mock("@/lib/workspace-panes", () => ({
  usePaneSearchParams: usePaneSearchParamsMock,
}));

import { WorkspaceFlashcardsPageClient } from "@/components/flashcards/workspace-flashcards-page-client";

const removedWrapperFile = resolve(import.meta.dirname, "./dashboard.tsx");
const workspaceFlashcardsPageClientSource = readFileSync(
  resolve(import.meta.dirname, "./workspace-flashcards-page-client.tsx"),
  "utf8"
);
const flashcardsDashboardHookSource = readFileSync(
  resolve(import.meta.dirname, "./use-flashcards-dashboard.ts"),
  "utf8"
);
const flashcardsDashboardClientSource = readFileSync(
  resolve(import.meta.dirname, "./flashcards-dashboard-client.ts"),
  "utf8"
);
const flashcardsDashboardSurfaceSource = readFileSync(
  resolve(import.meta.dirname, "./flashcards-dashboard-surface.tsx"),
  "utf8"
);
const flashcardsDashboardPanelsSource = readFileSync(
  resolve(import.meta.dirname, "./flashcards-dashboard-panels.tsx"),
  "utf8"
);
const flashcardsDashboardModelSource = readFileSync(
  resolve(import.meta.dirname, "./flashcards-dashboard-model.ts"),
  "utf8"
);

describe("WorkspaceFlashcardsPageClient ready branch", () => {
  it("wires the flashcards runtime hook into the surface without the old exported wrapper file", () => {
    usePaneSearchParamsMock.mockReturnValue(new URLSearchParams());
    useWorkspaceBootstrapMock.mockReturnValue({
      status: "ready",
      user: {
        email: "ada@avenire.local",
        id: "user-1",
      },
      workspace: {
        workspaceId: "workspace-1",
      },
    });
    useQueryMock.mockReturnValue({
      data: {
        dashboard: {
          cardSnapshots: [],
          sets: [],
        },
      },
      isError: false,
      isPending: false,
    });
    useFlashcardsDashboardMock.mockReturnValue({
      busy: false,
      orderedSets: [],
      reviewTarget: null,
      selectedSet: null,
    });

    const html = renderToStaticMarkup(<WorkspaceFlashcardsPageClient />);

    expect(useFlashcardsDashboardMock).toHaveBeenCalledWith({
      generationRequest: null,
      initialDashboard: {
        cardSnapshots: [],
        sets: [],
      },
    });
    expect(FlashcardsDashboardSurfaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: expect.objectContaining({
          busy: false,
          orderedSets: [],
          reviewTarget: null,
          selectedSet: null,
        }),
      }),
      undefined
    );
    expect(existsSync(removedWrapperFile)).toBe(false);
    expect(html).toContain("FLASHCARDS_SURFACE");
  });

  it("keeps the flashcards dashboard split between page-client gating, dashboard runtime hook, fetch client, pure model helpers, and presentational surface/panels", () => {
    expect(workspaceFlashcardsPageClientSource).toContain(
      "@/components/dashboard/workspace-bootstrap"
    );
    expect(workspaceFlashcardsPageClientSource).toContain("useQuery");
    expect(workspaceFlashcardsPageClientSource).toContain(
      "function ReadyFlashcardsDashboard"
    );
    expect(workspaceFlashcardsPageClientSource).toContain(
      "@/components/flashcards/use-flashcards-dashboard"
    );
    expect(workspaceFlashcardsPageClientSource).toContain(
      "@/components/flashcards/flashcards-dashboard-surface"
    );
    expect(workspaceFlashcardsPageClientSource).not.toContain("./dashboard");
    expect(workspaceFlashcardsPageClientSource).not.toContain(
      "buildOrderedFlashcardSets("
    );
    expect(existsSync(removedWrapperFile)).toBe(false);

    expect(flashcardsDashboardHookSource).toContain(
      "@/components/flashcards/flashcards-dashboard-client"
    );
    expect(flashcardsDashboardHookSource).toContain(
      "@/components/flashcards/flashcards-dashboard-model"
    );
    expect(flashcardsDashboardHookSource).toContain(
      "@/lib/flashcard-browser-cache"
    );
    expect(flashcardsDashboardHookSource).toContain("@/lib/workspace-panes");
    expect(flashcardsDashboardHookSource).not.toContain("HeaderActions");
    expect(flashcardsDashboardHookSource).not.toContain(
      "<FlashcardsDashboardPanels"
    );

    expect(flashcardsDashboardClientSource).toContain("/api/flashcards/sets");
    expect(flashcardsDashboardClientSource).toContain(
      "/api/flashcards/onboarding"
    );
    expect(flashcardsDashboardClientSource).not.toContain("useQuery");
    expect(flashcardsDashboardClientSource).not.toContain(
      "prefetchFlashcardSet"
    );

    expect(flashcardsDashboardModelSource).toContain(
      "export function buildOrderedFlashcardSets"
    );
    expect(flashcardsDashboardModelSource).toContain(
      "export function buildFlashcardSetTags"
    );
    expect(flashcardsDashboardModelSource).not.toContain("fetch(");
    expect(flashcardsDashboardModelSource).not.toContain("useQuery");

    expect(flashcardsDashboardSurfaceSource).toContain(
      "FlashcardsDashboardCreateDialog"
    );
    expect(flashcardsDashboardSurfaceSource).toContain(
      "FlashcardsDashboardPanels"
    );
    expect(flashcardsDashboardSurfaceSource).not.toContain("useQuery");
    expect(flashcardsDashboardPanelsSource).toContain(
      "getFlashcardEnrollmentLabel"
    );
  });
});
