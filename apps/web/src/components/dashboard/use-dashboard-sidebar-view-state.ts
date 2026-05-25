"use client";

import { useEffect, useState } from "react";
import {
  getNextMountedDashboardSidebarViews,
  resolveDashboardSidebarActiveTabValue,
  resolveDashboardSidebarSurfaceView,
  resolveInitialDashboardSidebarView,
  resolveInitialMountedDashboardSidebarViews,
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
    useState<SidebarSurfaceView>(() =>
      resolveInitialDashboardSidebarView({ activeView })
    );
  const [mobileSidebarView, setMobileSidebarView] =
    useState<SidebarSurfaceView>(() =>
      resolveInitialDashboardSidebarView({ activeView })
    );
  const [mountedViews, setMountedViews] = useState<
    Set<Exclude<DashboardSidebarView, null>>
  >(() => resolveInitialMountedDashboardSidebarViews({ activeView }));

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

  useEffect(() => {
    if (!activeView) {
      return;
    }

    if (isMobile) {
      setMobileSidebarView(activeView);
      return;
    }

    setDesktopSidebarView(activeView);
  }, [activeView, isMobile]);

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
