import type { Route } from "next";
import { redirect } from "next/navigation";
import { buildPageMetadata } from "@/lib/page-metadata";
import { requireWorkspaceRouteContext } from "@/lib/workspace-route-context";

export const metadata = buildPageMetadata({
  noIndex: true,
  title: "Files",
});

export default async function WorkspaceFilesPage() {
  const { workspace } = await requireWorkspaceRouteContext(
    "/workspace" as Route
  );

  redirect(
    `/workspace/files/${workspace.workspaceId}/folder/${workspace.rootFolderId}` as Route
  );
}
