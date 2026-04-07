"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";

export function WorkspaceFilesRootPageClient() {
  const router = useRouter();
  const { status, workspace } = useWorkspaceBootstrap();

  useEffect(() => {
    if (!workspace?.workspaceId || !workspace.rootFolderId) {
      return;
    }

    router.replace(
      `/workspace/files/${workspace.workspaceId}/folder/${workspace.rootFolderId}` as Route
    );
  }, [router, workspace?.rootFolderId, workspace?.workspaceId]);

  return <WorkspaceRoutePlaceholder label="Opening files..." />;
}
