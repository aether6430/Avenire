import { WorkspaceOverviewPageClient } from "@/components/dashboard/workspace-overview-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  noIndex: true,
  title: "Workspace",
});

export default function WorkspacePage() {
  return <WorkspaceOverviewPageClient />;
}
