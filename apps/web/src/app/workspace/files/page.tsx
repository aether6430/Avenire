import type { Route } from "next";
import { redirect } from "next/navigation";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getWorkspaceRouteContext } from "@/lib/workspace-route-context";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  noIndex: true,
  title: "Files",
});

export default async function WorkspaceFilesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [context, query] = await Promise.all([
    getWorkspaceRouteContext(),
    searchParams,
  ]);

  if (!context.session?.user) {
    redirect("/login");
  }

  if (!context.workspace) {
    redirect("/workspace");
  }

  if (!context.workspace.rootFolderId) {
    return (
      <WorkspaceRoutePlaceholder
        label="Workspace files unavailable."
        pending={false}
      />
    );
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") {
      params.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") {
          params.append(key, item);
        }
      }
    }
  }

  const suffix = params.toString();
  redirect(
    `/workspace/files/${context.workspace.workspaceId}/folder/${context.workspace.rootFolderId}${suffix ? `?${suffix}` : ""}` as Route
  );
}
