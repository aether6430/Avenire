"use client";

import { useCallback, useEffect, useRef } from "react";
import type { DashboardSidebarWorkspaceSummary } from "@/components/dashboard/dashboard-sidebar-runtime-model";
import { shouldSyncActiveOrganization } from "@/components/dashboard/dashboard-sidebar-workspaces-model";

export function useDashboardSidebarActiveOrganization({
  activeOrganizationId,
  pathname,
  workspaces,
}: {
  activeOrganizationId?: string | null;
  pathname: string;
  workspaces: DashboardSidebarWorkspaceSummary[];
}) {
  const setActiveOrganization = useCallback(
    async (organizationId?: string | null) => {
      if (!organizationId) {
        return;
      }
      const response = await fetch("/api/auth/organization/set-active", {
        body: JSON.stringify({ organizationId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Unable to switch active organization");
      }
    },
    []
  );

  const setActiveOrganizationIfNeeded = useCallback(
    async (organizationId?: string | null) => {
      if (
        !shouldSyncActiveOrganization({
          activeOrganizationId: activeOrganizationId ?? null,
          targetOrganizationId: organizationId ?? null,
        })
      ) {
        return;
      }

      await setActiveOrganization(organizationId ?? null);
    },
    [activeOrganizationId, setActiveOrganization]
  );

  const activeOrgSyncRef = useRef<string | null>(null);
  useEffect(() => {
    const workspaceIdFromRoute = pathname.match(
      /^\/workspace\/files\/([^/]+)/
    )?.[1];
    if (!(workspaceIdFromRoute && workspaces.length > 0)) {
      return;
    }
    const targetWorkspace = workspaces.find(
      (workspace) => workspace.workspaceId === workspaceIdFromRoute
    );
    if (!targetWorkspace) {
      return;
    }
    if (
      !shouldSyncActiveOrganization({
        activeOrganizationId: activeOrganizationId ?? null,
        targetOrganizationId: targetWorkspace.organizationId ?? null,
      })
    ) {
      return;
    }
    const syncKey = `${workspaceIdFromRoute}:${targetWorkspace.organizationId}`;
    if (activeOrgSyncRef.current === syncKey) {
      return;
    }
    activeOrgSyncRef.current = syncKey;
    void setActiveOrganizationIfNeeded(targetWorkspace.organizationId).catch(
      () => {
        activeOrgSyncRef.current = null;
      }
    );
  }, [
    activeOrganizationId,
    pathname,
    setActiveOrganizationIfNeeded,
    workspaces,
  ]);

  return { setActiveOrganizationIfNeeded };
}
