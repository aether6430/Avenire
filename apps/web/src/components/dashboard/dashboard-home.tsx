"use client";

import type { DashboardHomeProps } from "@/components/dashboard/dashboard-home-model";
import { DashboardHomeSurface } from "@/components/dashboard/dashboard-home-surface";
import { useDashboardHome } from "@/components/dashboard/use-dashboard-home";

export function DashboardHome(props: DashboardHomeProps) {
  const runtime = useDashboardHome(props);

  return (
    <DashboardHomeSurface
      currentUserId={props.currentUserId}
      runtime={runtime}
      weakestDrillTarget={props.weakestDrillTarget}
      workspaceId={props.workspaceId}
    />
  );
}
