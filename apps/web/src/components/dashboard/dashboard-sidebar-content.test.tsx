"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { DashboardSidebarMountedViewsMock, DashboardSidebarWorkspaceHomeMock } =
  vi.hoisted(() => ({
    DashboardSidebarMountedViewsMock: vi.fn(() => (
      <div>DASHBOARD_MOUNTED_VIEWS</div>
    )),
    DashboardSidebarWorkspaceHomeMock: vi.fn(() => (
      <div>DASHBOARD_WORKSPACE_HOME</div>
    )),
  }));

vi.mock("@/components/dashboard/dashboard-sidebar-mounted-views", () => ({
  DashboardSidebarMountedViews: DashboardSidebarMountedViewsMock,
}));

vi.mock("@/components/dashboard/dashboard-sidebar-workspace-home", () => ({
  DashboardSidebarWorkspaceHome: DashboardSidebarWorkspaceHomeMock,
}));

import { DashboardSidebarContent } from "@/components/dashboard/dashboard-sidebar-content";

describe("DashboardSidebarContent", () => {
  it("routes the body between workspace-home and mounted views", () => {
    const baseRuntime = {
      activeTabValue: "chat",
      closeMobileSidebar: () => {},
      isMobile: false,
      navigate: () => {},
      navigateToFilesRoot: async () => {},
      primaryFilesRoute: "/workspace/files",
      setDesktopSidebarView: () => {},
      setMobileSidebarView: () => {},
      sidebarView: "workspace",
      state: "expanded",
      toggleSidebar: () => {},
      warmWorkspaceSection: () => {},
    } as never;

    const workspaceHtml = renderToStaticMarkup(
      <DashboardSidebarContent runtime={baseRuntime} />
    );
    const mountedHtml = renderToStaticMarkup(
      <DashboardSidebarContent
        runtime={{ ...baseRuntime, sidebarView: "chat" }}
      />
    );

    expect(DashboardSidebarWorkspaceHomeMock).toHaveBeenCalledTimes(1);
    expect(DashboardSidebarMountedViewsMock).toHaveBeenCalledTimes(1);
    expect(workspaceHtml).toContain("DASHBOARD_WORKSPACE_HOME");
    expect(mountedHtml).toContain("DASHBOARD_MOUNTED_VIEWS");
  });
});
