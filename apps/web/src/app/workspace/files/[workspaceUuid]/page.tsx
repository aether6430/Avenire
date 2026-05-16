import { auth } from "@avenire/auth/server";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { listWorkspacesForUser } from "@/lib/file-data";
import { buildPageMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  noIndex: true,
  title: "Files",
});

export default async function WorkspaceFilesWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceUuid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ workspaceUuid }, query] = await Promise.all([params, searchParams]);
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const workspace =
    (await listWorkspacesForUser(session.user.id)).find(
      (candidate) => candidate.workspaceId === workspaceUuid
    ) ?? null;

  if (!workspace) {
    return (
      <WorkspaceRoutePlaceholder label="Workspace not found." pending={false} />
    );
  }

  if (!workspace.rootFolderId) {
    return (
      <WorkspaceRoutePlaceholder
        label="Workspace files unavailable."
        pending={false}
      />
    );
  }

  const paramsString = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") {
      paramsString.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") {
          paramsString.append(key, item);
        }
      }
    }
  }

  const suffix = paramsString.toString();
  redirect(
    `/workspace/files/${workspace.workspaceId}/folder/${workspace.rootFolderId}${suffix ? `?${suffix}` : ""}` as Route
  );
}
