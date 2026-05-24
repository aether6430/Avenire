"use client";

import type { Route } from "next";
import { useCallback, useMemo } from "react";
import type { DashboardSidebarWorkspaceSummary } from "@/components/dashboard/dashboard-sidebar-runtime-model";
import { readPreferredWorkspaceId } from "@/lib/preferred-workspace-storage";

type SidebarNavigate = (
  href: string,
  navigateOptions?: {
    openInNewPane?: boolean;
    replace?: boolean;
    scroll?: boolean;
  }
) => void;

export function useDashboardSidebarFilesRootNavigation({
  activeWorkspace,
  navigate,
  routeWorkspaceUuid,
  workspaces,
}: {
  activeWorkspace?: {
    name?: string;
    organizationId?: string | null;
    rootFolderId: string;
    workspaceId: string;
  } | null;
  navigate: SidebarNavigate;
  routeWorkspaceUuid: string | null;
  workspaces: DashboardSidebarWorkspaceSummary[];
}) {
  const primaryFilesRoute = useMemo<Route>(() => {
    const activeWorkspaceSummary =
      (routeWorkspaceUuid
        ? workspaces.find(
            (workspace) => workspace.workspaceId === routeWorkspaceUuid
          )
        : undefined) ??
      (activeWorkspace
        ? {
            name: activeWorkspace.name ?? "Workspace",
            organizationId: activeWorkspace.organizationId ?? "",
            rootFolderId: activeWorkspace.rootFolderId,
            workspaceId: activeWorkspace.workspaceId,
          }
        : undefined) ??
      workspaces[0];

    return activeWorkspaceSummary
      ? (`/workspace/files/${activeWorkspaceSummary.workspaceId}/folder/${activeWorkspaceSummary.rootFolderId}` as Route)
      : ("/workspace/files" as Route);
  }, [activeWorkspace, routeWorkspaceUuid, workspaces]);

  const navigateToFilesRoot = useCallback(
    async (options?: { openInNewPane?: boolean }) => {
      try {
        const preferredWorkspaceId = readPreferredWorkspaceId();
        const preferred = preferredWorkspaceId
          ? workspaces.find(
              (workspace) => workspace.workspaceId === preferredWorkspaceId
            )
          : undefined;
        const targetWorkspace =
          preferred ??
          (activeWorkspace
            ? {
                name: activeWorkspace.name ?? "Workspace",
                organizationId: activeWorkspace.organizationId ?? "",
                rootFolderId: activeWorkspace.rootFolderId,
                workspaceId: activeWorkspace.workspaceId,
              }
            : undefined) ??
          workspaces[0];

        if (targetWorkspace) {
          navigate(
            `/workspace/files/${targetWorkspace.workspaceId}/folder/${targetWorkspace.rootFolderId}` as Route,
            options
          );
          return;
        }

        const response = await fetch("/api/workspaces", { cache: "no-store" });
        if (!response.ok) {
          navigate("/workspace/files" as Route, options);
          return;
        }

        const payload = (await response.json()) as {
          rootFolderUuid?: string;
          workspaceUuid?: string;
        };

        if (payload.workspaceUuid && payload.rootFolderUuid) {
          navigate(
            `/workspace/files/${payload.workspaceUuid}/folder/${payload.rootFolderUuid}` as Route,
            options
          );
          return;
        }

        navigate("/workspace/files" as Route, options);
      } catch {
        navigate("/workspace/files" as Route, options);
      }
    },
    [activeWorkspace, navigate, workspaces]
  );

  return {
    navigateToFilesRoot,
    primaryFilesRoute,
  };
}
