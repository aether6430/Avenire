import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  listWorkspacesForUser,
  resolveWorkspaceForUser,
} from "@/lib/file-data";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeOrganizationId =
    (session as { session?: { activeOrganizationId?: string | null } }).session
      ?.activeOrganizationId ?? null;

  const [workspace, workspaces] = await Promise.all([
    resolveWorkspaceForUser(session.user.id, activeOrganizationId),
    listWorkspacesForUser(session.user.id),
  ]);

  const activeWorkspaceSummary =
    (workspace
      ? workspaces.find(
          (candidate) => candidate.workspaceId === workspace.workspaceId
        )
      : null) ?? null;

  return NextResponse.json({
    user: {
      email: session.user.email,
      id: session.user.id,
      image: session.user.image ?? null,
      name: session.user.name ?? null,
    },
    workspace: workspace
      ? {
          ...workspace,
          logo: activeWorkspaceSummary?.logo ?? null,
          name: activeWorkspaceSummary?.name ?? "Workspace",
        }
      : null,
    workspaces,
  });
}
