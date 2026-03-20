import { auth } from "@avenire/auth/server";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveWorkspaceForUser } from "@/lib/file-data";

export default async function DashboardFilesPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const activeOrganizationId =
    (session as { session?: { activeOrganizationId?: string | null } }).session
      ?.activeOrganizationId ?? null;
  const workspace = await resolveWorkspaceForUser(session.user.id, activeOrganizationId);

  if (!workspace) {
    redirect("/workspace" as Route);
  }

  redirect(
    `/workspace/files/${workspace.workspaceId}/folder/${workspace.rootFolderId}` as Route,
  );
}
