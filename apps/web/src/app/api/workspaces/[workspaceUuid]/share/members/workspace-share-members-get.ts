import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { findAuthUserByEmail, listWorkspacesForUser } from "@/lib/file-data";
import type { createApiLogger } from "@/lib/observability";
import {
  filterWorkspaceShareMembers,
  normalizeOrganizationMembers,
} from "./workspace-share-members-model";

interface HandleWorkspaceShareMembersGetOptions {
  apiLogger: ReturnType<typeof createApiLogger>;
  request: Request;
  user: {
    id: string;
  };
  workspaceUuid: string;
}

export async function handleWorkspaceShareMembersGet({
  apiLogger,
  request,
  user,
  workspaceUuid,
}: HandleWorkspaceShareMembersGetOptions) {
  const summaries = await listWorkspacesForUser(user.id);
  const summary = summaries.find((item) => item.workspaceId === workspaceUuid);
  if (!summary) {
    void apiLogger.requestFailed(404, "Workspace not found", { workspaceUuid });
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const membersResult = await auth.api.listMembers({
    query: {
      organizationId: summary.organizationId,
    },
    headers: await headers(),
  });

  const query = request.url
    ? (new URL(request.url).searchParams.get("q") ?? "")
    : "";
  const normalizedQuery = query.trim().toLowerCase();
  const mappedMembers = filterWorkspaceShareMembers({
    members: normalizeOrganizationMembers(membersResult),
    query,
  });

  if (
    normalizedQuery &&
    !mappedMembers.some((member) =>
      [member.name ?? "", member.email ?? "", member.userId ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    )
  ) {
    const fallbackUser = await findAuthUserByEmail(normalizedQuery);
    if (fallbackUser) {
      mappedMembers.unshift({
        avatar: null,
        email: fallbackUser.email ?? null,
        id: null,
        name: fallbackUser.name ?? null,
        role: "external",
        userId: fallbackUser.id,
      });
    }
  }

  void apiLogger.featureUsed("workspace.sharing.members.listed", {
    workspaceUuid,
  });
  void apiLogger.requestSucceeded(200, {
    workspaceUuid,
    memberCount: mappedMembers.length,
  });

  return NextResponse.json({
    members: mappedMembers,
  });
}
