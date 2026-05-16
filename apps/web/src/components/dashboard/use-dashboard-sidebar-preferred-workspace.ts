"use client";

import { type Dispatch, type SetStateAction, useEffect } from "react";
import {
  type DashboardSidebarWorkspaceSummary,
  resolveSidebarWorkspaceUuid,
  shouldSeedPreferredWorkspaceId,
  shouldSyncRouteWorkspacePreference,
} from "@/components/dashboard/dashboard-sidebar-runtime-model";
import {
  readPreferredWorkspaceId,
  usePreferredWorkspaceId,
  writePreferredWorkspaceId,
} from "@/lib/preferred-workspace-storage";

export function useDashboardSidebarPreferredWorkspace({
  activeChatWorkspaceId,
  activeWorkspaceId,
  routeWorkspaceUuid,
  setWorkspaceUuid,
  workspaces,
}: {
  activeChatWorkspaceId: string | null;
  activeWorkspaceId: string | null;
  routeWorkspaceUuid: string | null;
  setWorkspaceUuid: Dispatch<SetStateAction<string | null>>;
  workspaces: DashboardSidebarWorkspaceSummary[];
}) {
  const preferredWorkspaceId = usePreferredWorkspaceId();

  const derivedWorkspaceUuid = resolveSidebarWorkspaceUuid({
    activeChatWorkspaceId,
    activeWorkspaceId,
    preferredWorkspaceId,
    routeWorkspaceUuid,
    workspaces,
  });

  useEffect(() => {
    setWorkspaceUuid((previous) =>
      previous === derivedWorkspaceUuid ? previous : derivedWorkspaceUuid
    );
  }, [derivedWorkspaceUuid, setWorkspaceUuid]);

  useEffect(() => {
    const storedPreferredWorkspaceId = readPreferredWorkspaceId();
    if (
      !shouldSyncRouteWorkspacePreference({
        routeWorkspaceUuid,
        storedPreferredWorkspaceId,
      })
    ) {
      return;
    }

    writePreferredWorkspaceId(routeWorkspaceUuid);
  }, [routeWorkspaceUuid]);

  useEffect(() => {
    const storedPreferredWorkspaceId = readPreferredWorkspaceId();
    if (
      !shouldSeedPreferredWorkspaceId({
        derivedWorkspaceUuid,
        routeWorkspaceUuid,
        storedPreferredWorkspaceId,
      })
    ) {
      return;
    }

    writePreferredWorkspaceId(derivedWorkspaceUuid);
  }, [derivedWorkspaceUuid, routeWorkspaceUuid]);
}
