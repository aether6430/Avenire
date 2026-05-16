import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { WorkspaceFolderRoutePageClient } from "@/components/files/workspace-folder-route-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  noIndex: true,
  title: "Files",
});

export default async function WorkspaceFolderPage({
  params,
}: {
  params: Promise<{ folderUuid: string; workspaceUuid: string }>;
}) {
  const { folderUuid, workspaceUuid } = await params;

  return (
    <Suspense fallback={<WorkspaceRoutePlaceholder label="Loading files..." />}>
      <WorkspaceFolderRoutePageClient
        folderUuid={folderUuid}
        workspaceUuid={workspaceUuid}
      />
    </Suspense>
  );
}
