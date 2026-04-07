"use client";

import { useParams } from "next/navigation";
import { FileExplorer } from "@/components/files/explorer";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";

export function WorkspaceFolderRoutePageClient() {
  const params = useParams<{ folderUuid: string; workspaceUuid: string }>();
  const folderUuid =
    typeof params.folderUuid === "string" ? params.folderUuid : null;
  const workspaceUuid =
    typeof params.workspaceUuid === "string" ? params.workspaceUuid : null;

  if (!(folderUuid && workspaceUuid)) {
    return <WorkspaceRoutePlaceholder label="Loading files..." />;
  }

  return <FileExplorer folderUuid={folderUuid} workspaceUuid={workspaceUuid} />;
}
