import { Suspense } from "react";
import type { Metadata } from "next";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { WorkspaceFolderRoutePageClient } from "@/components/files/workspace-folder-route-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";
export const metadata: Metadata = buildPageMetadata({
  noIndex: true,
  title: "Files",
});

export default function WorkspaceFolderPage() {
  return (
    <Suspense fallback={<WorkspaceRoutePlaceholder label="Loading files..." />}>
      <WorkspaceFolderRoutePageClient />
    </Suspense>
  );
}
