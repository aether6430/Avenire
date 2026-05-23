import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { DashboardHomeSurfaceMock, useDashboardHomeMock } = vi.hoisted(() => ({
  DashboardHomeSurfaceMock: vi.fn(() => <div>DASHBOARD_HOME_SURFACE</div>),
  useDashboardHomeMock: vi.fn(),
}));

vi.mock("@/components/dashboard/dashboard-home-surface", () => ({
  DashboardHomeSurface: DashboardHomeSurfaceMock,
}));

vi.mock("@/components/dashboard/use-dashboard-home", () => ({
  useDashboardHome: useDashboardHomeMock,
}));

import { DashboardHome } from "@/components/dashboard/dashboard-home";

const removedOverviewSidebarSyncFile = resolve(
  import.meta.dirname,
  "./overview-sidebar-sync.tsx"
);

describe("DashboardHome", () => {
  it("wires the dashboard home runtime into the surface", () => {
    useDashboardHomeMock.mockReturnValue({
      greeting: { description: "desc", headline: "headline" },
      weakPointGroups: [],
    });

    const props = {
      activeMisconceptions: [],
      currentUserId: "user-1",
      flashcardSets: [],
      rootFolderId: "root-1",
      weakestConcepts: [],
      weakestDrillTarget: null,
      workspaceId: "workspace-1",
    };

    const html = renderToStaticMarkup(<DashboardHome {...props} />);

    expect(useDashboardHomeMock).toHaveBeenCalledWith(props);
    expect(DashboardHomeSurfaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currentUserId: "user-1",
        weakestDrillTarget: null,
        workspaceId: "workspace-1",
        runtime: expect.objectContaining({
          greeting: { description: "desc", headline: "headline" },
          weakPointGroups: [],
        }),
      }),
      undefined
    );
    expect(existsSync(removedOverviewSidebarSyncFile)).toBe(false);
    expect(html).toContain("DASHBOARD_HOME_SURFACE");
  });
});
