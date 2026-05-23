"use client";

import type { Route } from "next";
import { useCallback, useEffect } from "react";
import {
  type DashboardSidebarView,
  shouldWarmAllWorkspaceSurfacesOnStartup,
} from "@/components/dashboard/sidebar-startup";
import {
  warmDashboardBackground,
  warmWorkspaceSurface,
} from "@/lib/dashboard-warmup";

export function useDashboardSidebarWarmup({
  activeView,
  currentFolderId,
  deferredStartupReady,
  primaryChatRoute,
  primaryFilesRoute,
  rootFolderId,
  routerPrefetch,
  workspaceUuid,
}: {
  activeView: DashboardSidebarView;
  currentFolderId?: string;
  deferredStartupReady: boolean;
  primaryChatRoute: Route;
  primaryFilesRoute: Route;
  rootFolderId?: string | null;
  routerPrefetch: (href: Route) => void;
  workspaceUuid: string | null;
}) {
  const warmWorkspaceSection = useCallback(
    (section: "chat" | "flashcards" | "files" | "tasks") => {
      if (section === "chat") {
        routerPrefetch(primaryChatRoute);
        warmWorkspaceSurface("chat", {
          rootFolderId: rootFolderId ?? null,
          workspaceUuid,
        }).catch(() => undefined);
        return;
      }

      if (section === "flashcards") {
        routerPrefetch("/workspace/flashcards" as Route);
        import(
          "@/components/flashcards/flashcards-sidebar-panel-surface"
        ).catch(() => undefined);
        warmWorkspaceSurface("flashcards", {
          rootFolderId: rootFolderId ?? null,
          workspaceUuid,
        }).catch(() => undefined);
        return;
      }

      if (section === "tasks") {
        routerPrefetch("/workspace/tasks" as Route);
        return;
      }

      routerPrefetch(primaryFilesRoute);
      import("@/components/dashboard/sidebar-files-panel").catch(
        () => undefined
      );
      warmWorkspaceSurface("files", {
        currentFolderId,
        rootFolderId: rootFolderId ?? null,
        workspaceUuid,
      }).catch(() => undefined);
    },
    [
      currentFolderId,
      primaryChatRoute,
      primaryFilesRoute,
      rootFolderId,
      routerPrefetch,
      workspaceUuid,
    ]
  );

  useEffect(() => {
    if (!deferredStartupReady) {
      return;
    }

    const warmTargets = () => {
      import("@/components/settings/settings-dialog").catch(() => undefined);

      if (shouldWarmAllWorkspaceSurfacesOnStartup(activeView)) {
        routerPrefetch(primaryChatRoute);
        routerPrefetch("/workspace/flashcards" as Route);
        routerPrefetch(primaryFilesRoute);
        import("@/components/dashboard/sidebar-files-panel").catch(
          () => undefined
        );
        import(
          "@/components/flashcards/flashcards-sidebar-panel-surface"
        ).catch(() => undefined);
        import("@/components/dashboard/task-manager").catch(() => undefined);
        import("@/components/student-calendar").catch(() => undefined);
        warmDashboardBackground({
          currentFolderId,
          rootFolderId: rootFolderId ?? null,
          workspaceUuid,
        }).catch(() => undefined);
      }
    };

    if (typeof window === "undefined") {
      return;
    }

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => {
        warmTargets();
      });
      return () => {
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = setTimeout(warmTargets, 150);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    activeView,
    currentFolderId,
    deferredStartupReady,
    primaryChatRoute,
    primaryFilesRoute,
    rootFolderId,
    routerPrefetch,
    workspaceUuid,
  ]);

  return { warmWorkspaceSection };
}
