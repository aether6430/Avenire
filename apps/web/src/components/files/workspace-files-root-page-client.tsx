"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";

export function WorkspaceFilesRootPageClient({
  preferredWorkspaceUuid,
}: {
  preferredWorkspaceUuid?: string;
}) {
  const router = useRouter();
  const { status, workspace, workspaces } = useWorkspaceBootstrap();
  const targetWorkspaceUuid =
    preferredWorkspaceUuid?.trim() || workspace?.workspaceId || "";
  const targetWorkspace =
    workspaces.find(
      (candidate) => candidate.workspaceId === targetWorkspaceUuid
    ) ?? (workspace?.workspaceId === targetWorkspaceUuid ? workspace : null);

  useEffect(() => {
    if (!targetWorkspace?.workspaceId || !targetWorkspace.rootFolderId) {
      return;
    }

    router.replace(
      `/workspace/files/${targetWorkspace.workspaceId}/folder/${targetWorkspace.rootFolderId}` as Route
    );
  }, [router, targetWorkspace?.rootFolderId, targetWorkspace?.workspaceId]);

  if (status === "error") {
    return <WorkspaceRoutePlaceholder label="Unable to open files." />;
  }

  if (status === "ready" && !targetWorkspace) {
    return <WorkspaceRoutePlaceholder label="Workspace not found." />;
  }

  if (status === "ready" && targetWorkspace && !targetWorkspace.rootFolderId) {
    return <WorkspaceRoutePlaceholder label="Workspace files unavailable." />;
  }

  return <WorkspaceRoutePlaceholder label="Opening files..." />;
}
