import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { listWorkspacesForUser } from "@/lib/file-data";
import type { createApiLogger } from "@/lib/observability";
import {
  canManageWorkspaceMembers,
  normalizeOrganizationMembers,
  resolveWorkspaceShareMembersRouteError,
  WORKSPACE_SHARE_MEMBERS_REMOVE_ERROR,
  workspaceShareRemoveSchema,
} from "./workspace-share-members-model";

interface HandleWorkspaceShareMembersDeleteOptions {
  apiLogger: ReturnType<typeof createApiLogger>;
  request: Request;
  user: {
    id: string;
  };
  workspaceUuid: string;
}

export async function handleWorkspaceShareMembersDelete({
  apiLogger,
  request,
  user,
  workspaceUuid,
}: HandleWorkspaceShareMembersDeleteOptions) {
  try {
    const summaries = await listWorkspacesForUser(user.id);
    const summary = summaries.find(
      (item) => item.workspaceId === workspaceUuid
    );
    if (!summary) {
      void apiLogger.requestFailed(404, "Workspace not found", {
        workspaceUuid,
      });
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const membersResult = await auth.api.listMembers({
      query: {
        organizationId: summary.organizationId,
      },
      headers: await headers(),
    });
    const members = normalizeOrganizationMembers(membersResult);
    const currentMember = members.find((member) => member.userId === user.id);
    if (!canManageWorkspaceMembers(currentMember?.role)) {
      void apiLogger.requestFailed(403, "Only admins can remove members", {
        workspaceUuid,
      });
      return NextResponse.json(
        { error: "Only admins can remove members" },
        { status: 403 }
      );
    }

    const parsed = workspaceShareRemoveSchema.safeParse(
      await request.json().catch(() => ({}))
    );
    if (!parsed.success) {
      void apiLogger.requestFailed(400, "Missing memberIdOrEmail", {
        workspaceUuid,
      });
      return NextResponse.json(
        { error: "Missing memberIdOrEmail" },
        { status: 400 }
      );
    }

    const removed = await auth.api.removeMember({
      body: {
        organizationId: summary.organizationId,
        memberIdOrEmail: parsed.data.memberIdOrEmail.trim(),
      },
      headers: await headers(),
    });

    void apiLogger.meter("meter.share.created", {
      resourceType: "workspace-member-removed",
      workspaceUuid,
    });
    void apiLogger.featureUsed("workspace.sharing.member.removed", {
      workspaceUuid,
    });
    void apiLogger.requestSucceeded(200, { workspaceUuid });

    return NextResponse.json({ status: "removed", removed });
  } catch (error) {
    void apiLogger.requestFailed(500, error, { workspaceUuid });
    return NextResponse.json(
      {
        error: resolveWorkspaceShareMembersRouteError(
          error,
          WORKSPACE_SHARE_MEMBERS_REMOVE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
