"use client";

import { FileExplorer } from "@/components/files/explorer";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { usePanePathname } from "@/lib/workspace-panes";

export function WorkspaceFolderRoutePageClient({
  folderUuid: folderUuidProp,
  workspaceUuid: workspaceUuidProp,
}: {
  folderUuid?: string;
  workspaceUuid?: string;
}) {
  const pathname = usePanePathname();
  const match = pathname.match(/^\/workspace\/files\/([^/]+)\/folder\/([^/?#]+)/);
  const folderUuid = folderUuidProp ?? match?.[2] ?? null;
  const workspaceUuid = workspaceUuidProp ?? match?.[1] ?? null;

  if (!(folderUuid && workspaceUuid)) {
    return <WorkspaceRoutePlaceholder label="Loading files..." />;
  }

  return <FileExplorer folderUuid={folderUuid} workspaceUuid={workspaceUuid} />;
}
