"use client";

import type { Route } from "next";
import { useCallback, useState } from "react";
import type { DashboardSidebarWorkspaceSummary } from "@/components/dashboard/dashboard-sidebar-runtime-model";
import { useDashboardSidebarActiveOrganization } from "@/components/dashboard/use-dashboard-sidebar-active-organization";
import { useDashboardSidebarFilesRootNavigation } from "@/components/dashboard/use-dashboard-sidebar-files-root-navigation";
import { useDashboardSidebarInvitations } from "@/components/dashboard/use-dashboard-sidebar-invitations";
import { useDashboardSidebarWorkspaceList } from "@/components/dashboard/use-dashboard-sidebar-workspace-list";
import { writePreferredWorkspaceId } from "@/lib/preferred-workspace-storage";

type SidebarNavigate = (
  href: string,
  navigateOptions?: {
    openInNewPane?: boolean;
    replace?: boolean;
    scroll?: boolean;
  }
) => void;

export function useDashboardSidebarWorkspaces({
  activeWorkspace,
  deferredStartupReady,
  initialWorkspaces,
  navigate,
  pathname,
  routeWorkspaceUuid,
  workspaceBootstrapStatus,
}: {
  activeWorkspace?: {
    name?: string;
    organizationId?: string | null;
    rootFolderId: string;
    workspaceId: string;
  } | null;
  deferredStartupReady: boolean;
  initialWorkspaces: DashboardSidebarWorkspaceSummary[];
  navigate: SidebarNavigate;
  pathname: string;
  routeWorkspaceUuid: string | null;
  workspaceBootstrapStatus: "error" | "loading" | "ready" | "unauthorized";
}) {
  const [workspaceActionStatus, setWorkspaceActionStatus] = useState<
    string | null
  >(null);
  const workspaceListRuntime = useDashboardSidebarWorkspaceList({
    deferredStartupReady,
    initialWorkspaces,
    workspaceBootstrapStatus,
  });
  const {
    loadWorkspaces,
    workspaces,
    workspacesLoadFailed,
    workspacesLoading,
  } = workspaceListRuntime;

  const { setActiveOrganizationIfNeeded } =
    useDashboardSidebarActiveOrganization({
      activeOrganizationId: activeWorkspace?.organizationId ?? null,
      pathname,
      workspaces,
    });

  const switchWorkspace = useCallback(
    async (workspace: DashboardSidebarWorkspaceSummary) => {
      setWorkspaceActionStatus(null);
      try {
        await setActiveOrganizationIfNeeded(workspace.organizationId ?? null);
      } catch {
        setWorkspaceActionStatus("Unable to switch workspace.");
        return;
      }
      writePreferredWorkspaceId(workspace.workspaceId);
      navigate(
        `/workspace/files/${workspace.workspaceId}/folder/${workspace.rootFolderId}` as Route
      );
      setWorkspaceActionStatus(null);
    },
    [navigate, setActiveOrganizationIfNeeded]
  );

  const createWorkspace = useCallback(
    async (name: string) => {
      const response = await fetch("/api/workspaces", {
        body: JSON.stringify({ name }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        let message = "Unable to create workspace.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) {
            message = payload.error;
          }
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }

      const payload = (await response.json()) as {
        workspace?: DashboardSidebarWorkspaceSummary;
      };
      if (!payload.workspace) {
        throw new Error("Workspace was created but could not be loaded.");
      }

      await loadWorkspaces();
      await switchWorkspace(payload.workspace);
    },
    [loadWorkspaces, switchWorkspace]
  );

  const invitationsRuntime = useDashboardSidebarInvitations({
    deferredStartupReady,
    loadWorkspaces,
    setActiveOrganizationIfNeeded,
    setWorkspaceActionStatus,
    switchWorkspace,
  });
  const filesRootNavigation = useDashboardSidebarFilesRootNavigation({
    activeWorkspace,
    navigate,
    routeWorkspaceUuid,
    workspaces,
  });

  return {
    createWorkspace,
    invitations: invitationsRuntime.invitations,
    invitationsLoadFailed: invitationsRuntime.invitationsLoadFailed,
    invitationsLoading: invitationsRuntime.invitationsLoading,
    loadInvitations: invitationsRuntime.loadInvitations,
    loadWorkspaces,
    navigateToFilesRoot: filesRootNavigation.navigateToFilesRoot,
    primaryFilesRoute: filesRootNavigation.primaryFilesRoute,
    respondToInvitation: invitationsRuntime.respondToInvitation,
    switchWorkspace,
    workspaceActionStatus,
    workspaces,
    workspacesLoadFailed,
    workspacesLoading,
  };
}
