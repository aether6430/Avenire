import { auth } from "@avenire/auth/server";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { WorkspaceFolderRoutePageClient } from "@/components/files/workspace-folder-route-page-client";
import { getFolderWithAncestors, listWorkspacesForUser } from "@/lib/file-data";
import { buildPageMetadata } from "@/lib/page-metadata";
import { resolveWorkspaceFilesPageTitle } from "../../../workspace-files-page-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ folderUuid: string; workspaceUuid: string }>;
}): Promise<Metadata> {
  const { folderUuid, workspaceUuid } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return buildPageMetadata({
      noIndex: true,
      title: "Files",
    });
  }

  const [folderResult, workspaces] = await Promise.all([
    getFolderWithAncestors(workspaceUuid, folderUuid),
    listWorkspacesForUser(session.user.id),
  ]);

  const workspaceName =
    workspaces.find((workspace) => workspace.workspaceId === workspaceUuid)
      ?.name ?? null;

  return buildPageMetadata({
    noIndex: true,
    title: resolveWorkspaceFilesPageTitle({
      folderName: folderResult?.folder?.name ?? null,
      isAtWorkspaceRoot: folderResult?.folder?.parentId === null,
      workspaceName,
    }),
  });
}

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
