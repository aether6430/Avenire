"use client";

import type { Route } from "next";
import { useEffect } from "react";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { usePaneRouter, usePaneSearchParams } from "@/lib/workspace-panes";

export function buildWorkspaceFilesRootRoute(input: {
  rootFolderId: string;
  search: string;
  workspaceId: string;
}) {
  const suffix = input.search.trim();
  return `/workspace/files/${input.workspaceId}/folder/${input.rootFolderId}${suffix ? `?${suffix}` : ""}` as Route;
}

export function WorkspaceFilesRootPageClient({
  preferredWorkspaceUuid,
}: {
  preferredWorkspaceUuid?: string;
}) {
  const router = usePaneRouter();
  const paneSearchParams = usePaneSearchParams();
  const { status, workspace, workspaces } = useWorkspaceBootstrap();
  const targetWorkspaceUuid =
    preferredWorkspaceUuid?.trim() || workspace?.workspaceId || "";
  const targetWorkspace =
    workspaces.find(
      (candidate) => candidate.workspaceId === targetWorkspaceUuid
    ) ?? (workspace?.workspaceId === targetWorkspaceUuid ? workspace : null);

  useEffect(() => {
    if (!(targetWorkspace?.workspaceId && targetWorkspace.rootFolderId)) {
      return;
    }

    router.replace(
      buildWorkspaceFilesRootRoute({
        rootFolderId: targetWorkspace.rootFolderId,
        search: paneSearchParams.toString(),
        workspaceId: targetWorkspace.workspaceId,
      })
    );
  }, [
    paneSearchParams,
    router,
    targetWorkspace?.rootFolderId,
    targetWorkspace?.workspaceId,
  ]);

  if (status === "error") {
    return (
      <WorkspaceRoutePlaceholder
        label="Unable to load files."
        pending={false}
      />
    );
  }

  if (status === "ready" && !targetWorkspace) {
    return (
      <WorkspaceRoutePlaceholder label="Workspace not found." pending={false} />
    );
  }

  if (status === "ready" && targetWorkspace && !targetWorkspace.rootFolderId) {
    return (
      <WorkspaceRoutePlaceholder
        label="Workspace files unavailable."
        pending={false}
      />
    );
  }

  return <WorkspaceRoutePlaceholder label="Loading files..." />;
}
