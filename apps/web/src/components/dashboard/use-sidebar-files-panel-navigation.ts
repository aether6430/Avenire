"use client";

import { useSidebar } from "@avenire/ui/components/sidebar";
import type { Route } from "next";
import { type MouseEvent, useCallback } from "react";
import { useWorkspaceSurfaceNavigation } from "@/lib/workspace-panes";

export function useSidebarFilesPanelNavigation() {
  const { isMobile } = useSidebar();
  const { navigate } = useWorkspaceSurfaceNavigation({
    panesEnabled: !isMobile,
  });

  const handlePaneIntent = useCallback(
    (event: MouseEvent<HTMLElement>, href: Route) => {
      if (isMobile) {
        return false;
      }

      if (event.type === "contextmenu") {
        event.preventDefault();
        navigate(href, { openInNewPane: true });
        return true;
      }

      if (event.altKey) {
        event.preventDefault();
        navigate(href, { openInNewPane: true });
        return true;
      }

      return false;
    },
    [isMobile, navigate]
  );

  const navigateToFolder = useCallback(
    (folderId: string, routeWorkspaceUuid: string) => {
      const href =
        `/workspace/files/${routeWorkspaceUuid}/folder/${folderId}` as Route;
      navigate(href);
    },
    [navigate]
  );

  const navigateToFile = useCallback(
    (fileId: string, folderId: string, routeWorkspaceUuid: string) => {
      const href =
        `/workspace/files/${routeWorkspaceUuid}/folder/${folderId}?file=${fileId}` as Route;
      navigate(href);
    },
    [navigate]
  );

  const openFolderInNewPane = useCallback(
    (folderId: string, routeWorkspaceUuid: string) => {
      navigate(
        `/workspace/files/${routeWorkspaceUuid}/folder/${folderId}` as Route,
        { openInNewPane: true }
      );
    },
    [navigate]
  );

  const openFileInNewPane = useCallback(
    (fileId: string, folderId: string, routeWorkspaceUuid: string) => {
      navigate(
        `/workspace/files/${routeWorkspaceUuid}/folder/${folderId}?file=${fileId}` as Route,
        { openInNewPane: true }
      );
    },
    [navigate]
  );

  return {
    handlePaneIntent,
    navigateToFile,
    navigateToFolder,
    openFileInNewPane,
    openFolderInNewPane,
  };
}
