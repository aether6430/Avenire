"use client";

import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import {
  resolveExplorerRouteContext,
  resolveExplorerWorkspaceName,
} from "@/components/files/explorer/explorer-shell-model";
import { readCachedWorkspaces } from "@/lib/dashboard-browser-cache";
import { usePaneWorkspaceHistoryActions } from "@/stores/workspaceHistoryStore";
import { useWorkspacePaneStore } from "@/stores/workspacePaneStore";

const FILE_EXPLORER_VIEW_MODE_KEY = "file-explorer-view-mode";

interface UseExplorerShellOptions {
  folderInputRef: RefObject<HTMLInputElement | null>;
  folderUuidFromPage?: string;
  pathname: string;
  searchParams: { toString(): string };
  workspaceUuidFromPage?: string;
}

function readStoredExplorerViewMode() {
  try {
    return window.localStorage.getItem(FILE_EXPLORER_VIEW_MODE_KEY) === "list"
      ? "list"
      : "cards";
  } catch {
    return "cards";
  }
}

export function useExplorerShell({
  folderInputRef,
  folderUuidFromPage,
  pathname,
  searchParams,
  workspaceUuidFromPage,
}: UseExplorerShellOptions) {
  const { workspaces: bootstrapWorkspaces } = useWorkspaceBootstrap();
  const { recordRoute } = usePaneWorkspaceHistoryActions();
  const paneCount = useWorkspacePaneStore((state) => state.panes.length);
  const [workspaceName, setWorkspaceName] = useState("Workspace");
  const [viewMode, setViewMode] = useState<"cards" | "list">(
    readStoredExplorerViewMode
  );
  const lastRecordedRouteRef = useRef<string | null>(null);

  const { currentFolderId, workspaceUuid } = useMemo(
    () =>
      resolveExplorerRouteContext({
        folderUuidFromPage,
        pathname,
        workspaceUuidFromPage,
      }),
    [folderUuidFromPage, pathname, workspaceUuidFromPage]
  );

  const currentRoute = useMemo(() => {
    const queryString = searchParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const resolvedWorkspaceName = resolveExplorerWorkspaceName({
      bootstrapWorkspaces,
      cachedWorkspaces: readCachedWorkspaces() ?? [],
      workspaceUuid,
    });

    if (resolvedWorkspaceName) {
      setWorkspaceName(resolvedWorkspaceName);
    }
  }, [bootstrapWorkspaces, workspaceUuid]);

  useEffect(() => {
    if (lastRecordedRouteRef.current === currentRoute) {
      return;
    }

    lastRecordedRouteRef.current = currentRoute;
    recordRoute(currentRoute);
  }, [currentRoute, recordRoute]);

  useEffect(() => {
    window.localStorage.setItem(FILE_EXPLORER_VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    const input = folderInputRef.current;
    if (!input) {
      return;
    }

    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
  }, [folderInputRef]);

  return {
    canClosePane: paneCount > 1,
    currentFolderId,
    viewMode,
    setViewMode,
    workspaceName,
    workspaceUuid,
  };
}
