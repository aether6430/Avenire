import { WorkspaceFilesRootPageClient } from "@/components/files/workspace-files-root-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  noIndex: true,
  title: "Files",
});

export default async function WorkspaceFilesWorkspacePage({
  params,
}: {
  params: Promise<{ workspaceUuid: string }>;
}) {
  const { workspaceUuid } = await params;
  return (
    <WorkspaceFilesRootPageClient preferredWorkspaceUuid={workspaceUuid} />
  );
}
