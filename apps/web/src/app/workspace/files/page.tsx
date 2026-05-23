import { WorkspaceFilesRootPageClient } from "@/components/files/workspace-files-root-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  noIndex: true,
  title: "Files",
});

export default function WorkspaceFilesPage() {
  return <WorkspaceFilesRootPageClient />;
}
