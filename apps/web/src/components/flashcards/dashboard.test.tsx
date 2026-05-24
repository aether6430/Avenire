import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const {
  useFlashcardsDashboardMock,
  usePaneSearchParamsMock,
  useQueryMock,
  useWorkspaceBootstrapMock,
} = vi.hoisted(() => ({
  useFlashcardsDashboardMock: vi.fn(),
  usePaneSearchParamsMock: vi.fn(),
  useQueryMock: vi.fn(),
  useWorkspaceBootstrapMock: vi.fn(),
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

vi.mock("@/components/dashboard/header-portal", () => ({
  HeaderActions: ({ children }: { children: ReactNode }) => <>{children}</>,
  HeaderBreadcrumbs: ({ children }: { children: ReactNode }) => <>{children}</>,
  HeaderLeadingIcon: ({ children }: { children: ReactNode }) => <>{children}</>,
  HeaderTitle: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/flashcards/flashcards-dashboard-create-dialog", () => ({
  FlashcardsDashboardCreateDialog: () => <div>CREATE_DIALOG</div>,
}));

vi.mock("@/components/flashcards/flashcards-dashboard-panels", () => ({
  FlashcardsDashboardPanels: () => <div>FLASHCARDS_PANELS</div>,
}));

vi.mock(
  "@/components/flashcards/flashcards-dashboard-misconception-dialog",
  () => ({
    FlashcardsDashboardMisconceptionDialog: () => (
      <div>FLASHCARDS_MISCONCEPTION_DIALOG</div>
    ),
  })
);

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
      activeMisconceptions: [],
      adjustMisconceptionConfidence: async () => {},
      busy: false,
      clearMisconception: async () => {},
      createOpen: false,
      createSet: async () => {},
      createStatus: null,
      dashboard: { cardSnapshots: [], sets: [] },
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
    });

    const html = renderToStaticMarkup(<WorkspaceFlashcardsPageClient />);

    expect(useFlashcardsDashboardMock).toHaveBeenCalledWith({
      generationRequest: null,
      initialDashboard: {
        cardSnapshots: [],
        sets: [],
      },
    });
    expect(existsSync(removedWrapperFile)).toBe(false);
    expect(html).toContain("CREATE_DIALOG");
    expect(html).toContain("FLASHCARDS_MISCONCEPTION_DIALOG");
    expect(html).toContain("FLASHCARDS_PANELS");
  });

  it("keeps the flashcards dashboard split between page-client gating, dashboard runtime hook, fetch client, pure model helpers, and presentational panels", () => {
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
      "export function FlashcardsDashboardSurface"
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

    expect(workspaceFlashcardsPageClientSource).toContain(
      "FlashcardsDashboardCreateDialog"
    );
    expect(workspaceFlashcardsPageClientSource).toContain(
      "FlashcardsDashboardMisconceptionDialog"
    );
    expect(workspaceFlashcardsPageClientSource).toContain(
      "FlashcardsDashboardPanels"
    );
    expect(workspaceFlashcardsPageClientSource).not.toContain(
      "@/components/flashcards/flashcards-dashboard-surface"
    );
    expect(flashcardsDashboardPanelsSource).toContain(
      "getFlashcardEnrollmentLabel"
    );
  });
});
