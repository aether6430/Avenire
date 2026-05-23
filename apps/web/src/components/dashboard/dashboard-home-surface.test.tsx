import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { useDashboardUiStoreMock } = vi.hoisted(() => ({
  useDashboardUiStoreMock: Object.assign(
    (selector: (state: { homeTab: string; insightsTab: string }) => unknown) =>
      selector({ homeTab: "tasks", insightsTab: "weak-points" }),
    {
      persist: {
        rehydrate: vi.fn(),
      },
    }
  ),
}));

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ComponentProps<"button"> & { children?: ReactNode }) =>
    createElement("button", props, children),
}));

vi.mock("@avenire/ui/components/spinner", () => ({
  Spinner: () => createElement("span", null, "spinner"),
}));

vi.mock("@avenire/ui/lib/utils", () => ({
  cn: (...values: Array<string | false | null | undefined>) =>
    values.filter(Boolean).join(" "),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => createElement("img", props),
}));

vi.mock("@/stores/dashboardUiStore", () => ({
  dashboardUiActions: {
    setHomeTab: vi.fn(),
    setInsightsTab: vi.fn(),
  },
  useDashboardUiStore: useDashboardUiStoreMock,
}));

vi.mock("@/components/dashboard/header-portal", () => ({
  HeaderBreadcrumbs: ({ children }: { children: ReactNode }) =>
    createElement("div", { "data-breadcrumbs": "1" }, children),
  HeaderTitle: ({ children }: { children: ReactNode }) =>
    createElement("div", { "data-title": "1" }, children),
}));

vi.mock("@/components/dashboard/quick-capture-dialog", () => ({
  QuickCaptureDialog: ({ trigger }: { trigger: ReactNode }) => trigger,
}));

import { DashboardHomeSurface } from "@/components/dashboard/dashboard-home-surface";

describe("DashboardHomeSurface", () => {
  it("labels the workspace header breadcrumb as overview", () => {
    const html = renderToStaticMarkup(
      <DashboardHomeSurface
        currentUserId="user-1"
        runtime={{
          activeMisconceptions: [],
          activityErrorMessage: null,
          activityLoadFailed: false,
          activities: [],
          compactGreeting: "Compact greeting",
          flashcardSets: [],
          greeting: {
            description: "Tasks and reviews are ready.",
            headline: "Hey test user",
          },
          improveMisconception: async () => {},
          isCompactPane: false,
          loadingActivities: false,
          openChatsWorkspace: () => {},
          openFilesWorkspace: () => {},
          openFlashcardsWorkspace: () => {},
          openMisconceptionFlashcards: () => {},
          openMisconceptionTutor: () => {},
          resolveMisconception: async () => {},
          selectedMisconception: null,
          setSelectedMisconception: () => {},
          startReview: () => {},
          weakPointGroups: [],
        }}
        weakestDrillTarget={null}
        workspaceId="workspace-1"
      />
    );

    expect(html).toContain('data-title="1"');
    expect(html).toContain(">Workspace<");
    expect(html).toContain(">Overview<");
    expect(html).not.toContain(">Mobile<");
    expect(html).not.toContain(">Desktop<");
  });
});
