"use client";

import { useEffect } from "react";
import type { DashboardOverviewStats } from "@/stores/dashboardOverviewStore";
import { useDashboardOverviewStore } from "@/stores/dashboardOverviewStore";

export function DashboardOverviewSidebarSync({
  stats,
}: {
  stats: DashboardOverviewStats;
}) {
  const setStats = useDashboardOverviewStore((state) => state.setStats);
  const clearStats = useDashboardOverviewStore((state) => state.clearStats);

  useEffect(() => {
    setStats(stats);
    return () => clearStats();
  }, [clearStats, setStats, stats]);

  return null;
}
