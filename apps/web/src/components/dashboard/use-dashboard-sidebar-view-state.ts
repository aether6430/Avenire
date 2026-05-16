"use client";

import { useEffect, useState } from "react";
import {
  getNextMountedDashboardSidebarViews,
  resolveDashboardSidebarActiveTabValue,
  resolveDashboardSidebarSurfaceView,
} from "@/components/dashboard/dashboard-sidebar-runtime-model";
import type { DashboardSidebarView } from "@/components/dashboard/sidebar-startup";

type SidebarSurfaceView = Exclude<DashboardSidebarView, null>;

export function useDashboardSidebarViewState({
  activeView,
  isMobile,
}: {
  activeView: DashboardSidebarView;
  isMobile: boolean;
}) {
  const [desktopSidebarView, setDesktopSidebarView] =
    useState<SidebarSurfaceView>(() => activeView ?? "workspace");
  const [mobileSidebarView, setMobileSidebarView] =
    useState<SidebarSurfaceView>(() => activeView ?? "workspace");
  const [mountedViews, setMountedViews] = useState<
    Set<Exclude<DashboardSidebarView, "workspace" | null>>
  >(() =>
    activeView && activeView !== "workspace" ? new Set([activeView]) : new Set()
  );

  const sidebarView = resolveDashboardSidebarSurfaceView({
    desktopSidebarView,
    isMobile,
    mobileSidebarView,
  });
  const activeTabValue = resolveDashboardSidebarActiveTabValue(sidebarView);

  useEffect(() => {
    setMountedViews((previous) =>
      getNextMountedDashboardSidebarViews({
        mountedViews: previous,
        sidebarView,
      })
    );
  }, [sidebarView]);

  return {
    activeTabValue,
    desktopSidebarView,
    mobileSidebarView,
    mountedViews,
    setDesktopSidebarView,
    setMobileSidebarView,
    sidebarView,
  };
}
