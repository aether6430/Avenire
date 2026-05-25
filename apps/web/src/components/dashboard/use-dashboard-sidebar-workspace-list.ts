"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardSidebarWorkspaceSummary } from "@/components/dashboard/dashboard-sidebar-runtime-model";
import { shouldLoadWorkspaceListOnStartup } from "@/components/dashboard/sidebar-startup";
import {
  readCachedWorkspaces,
  writeCachedWorkspaces,
} from "@/lib/dashboard-browser-cache";

export function useDashboardSidebarWorkspaceList({
  deferredStartupReady,
  initialWorkspaces,
  workspaceBootstrapStatus,
}: {
  deferredStartupReady: boolean;
  initialWorkspaces: DashboardSidebarWorkspaceSummary[];
  workspaceBootstrapStatus: "error" | "loading" | "ready" | "unauthorized";
}) {
  const [workspaces, setWorkspaces] = useState<
    DashboardSidebarWorkspaceSummary[]
  >(() => readCachedWorkspaces() ?? initialWorkspaces);
  const [workspacesErrorMessage, setWorkspacesErrorMessage] = useState<
    string | null
  >(null);
  const [workspacesLoadFailed, setWorkspacesLoadFailed] = useState(false);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);

  useEffect(() => {
    if (initialWorkspaces.length === 0) {
      return;
    }

    setWorkspaces((previous) => {
      if (
        previous.length === initialWorkspaces.length &&
        previous.every(
          (workspace, index) =>
            workspace.workspaceId === initialWorkspaces[index]?.workspaceId &&
            workspace.organizationId ===
              initialWorkspaces[index]?.organizationId &&
            workspace.rootFolderId === initialWorkspaces[index]?.rootFolderId &&
            workspace.name === initialWorkspaces[index]?.name
        )
      ) {
        return previous;
      }

      return initialWorkspaces;
    });
  }, [initialWorkspaces]);

  const loadWorkspaces = useCallback(async () => {
    setWorkspacesLoading(true);
    setWorkspacesLoadFailed(false);
    setWorkspacesErrorMessage(null);
    try {
      const response = await fetch("/api/workspaces/list", {
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setWorkspacesErrorMessage(
          payload.error?.trim() || "Unable to load workspaces."
        );
        setWorkspacesLoadFailed(true);
        return;
      }
      const payload = (await response.json()) as {
        workspaces?: DashboardSidebarWorkspaceSummary[];
      };
      const nextWorkspaces = payload.workspaces ?? [];
      setWorkspaces(nextWorkspaces);
      setWorkspacesErrorMessage(null);
      setWorkspacesLoadFailed(false);
      writeCachedWorkspaces(
        nextWorkspaces.map((workspace) => ({
          ...workspace,
          organizationId: workspace.organizationId ?? "",
        }))
      );
    } catch (error) {
      setWorkspacesErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to load workspaces."
      );
      setWorkspacesLoadFailed(true);
    } finally {
      setWorkspacesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      !shouldLoadWorkspaceListOnStartup({
        bootstrapStatus: workspaceBootstrapStatus,
        deferredStartupReady,
        initialWorkspaceCount: initialWorkspaces.length,
        workspaceCount: workspaces.length,
      })
    ) {
      return;
    }
    void loadWorkspaces();
  }, [
    deferredStartupReady,
    initialWorkspaces.length,
    loadWorkspaces,
    workspaceBootstrapStatus,
    workspaces.length,
  ]);

  return {
    loadWorkspaces,
    workspaces,
    workspacesErrorMessage,
    workspacesLoadFailed,
    workspacesLoading,
  };
}
