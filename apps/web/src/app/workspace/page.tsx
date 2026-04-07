import { Suspense } from "react";
import { WorkspaceOverviewPageClient } from "@/components/dashboard/workspace-overview-page-client";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  noIndex: true,
  title: "Workspace",
});

export default function WorkspacePage() {
  return (
    <Suspense fallback={<WorkspaceRoutePlaceholder label="Loading workspace..." />}>
      <WorkspaceOverviewPageClient />
    </Suspense>
  );
}
