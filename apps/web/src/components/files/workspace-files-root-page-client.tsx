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
  const { workspace } = useWorkspaceBootstrap();

  useEffect(() => {
    if (!workspace?.workspaceId || !workspace.rootFolderId) {
      return;
    }

    const targetWorkspaceUuid =
      preferredWorkspaceUuid?.trim() || workspace.workspaceId;

    router.replace(
      `/workspace/files/${targetWorkspaceUuid}/folder/${workspace.rootFolderId}` as Route
    );
  }, [
    preferredWorkspaceUuid,
    router,
    workspace?.rootFolderId,
    workspace?.workspaceId,
  ]);

  return <WorkspaceRoutePlaceholder label="Opening files..." />;
}
