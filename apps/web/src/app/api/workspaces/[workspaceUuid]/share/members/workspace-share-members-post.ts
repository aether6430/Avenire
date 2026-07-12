import { sendWorkspaceShareEmail } from "@avenire/auth/server";
import { NextResponse } from "next/server";
import { resolveAppBaseUrl } from "@/lib/app-base-url";
import { parseJsonRequest, unknownJsonRequestSchema } from "@/lib/api-request";
import {
  createWorkspaceInvitationByEmail,
  findAuthUserByEmail,
  listWorkspaceMembers,
  listWorkspacesForUser,
  updateWorkspaceMemberRoleForUser,
} from "@/lib/file-data";
import type { createApiLogger } from "@/lib/observability";
import {
  buildWorkspaceShareUrl,
  canManageWorkspaceMembers,
  resolveInviteRole,
  resolveWorkspaceShareMembersRouteError,
  WORKSPACE_SHARE_MEMBERS_INVITE_ERROR,
  workspaceShareInviteSchema,
} from "./workspace-share-members-model";

interface HandleWorkspaceShareMembersPostOptions {
  apiLogger: ReturnType<typeof createApiLogger>;
  request: Request;
  user: {
    id: string;
    name?: string | null;
  };
  workspaceUuid: string;
}

export async function handleWorkspaceShareMembersPost({
  apiLogger,
  request,
  user,
  workspaceUuid,
}: HandleWorkspaceShareMembersPostOptions) {
  try {
    const members = await listWorkspaceMembers(workspaceUuid);
    const currentMember = members.find((member) => member.userId === user.id);
    if (!canManageWorkspaceMembers(currentMember?.role)) {
      void apiLogger.requestFailed(
        403,
        "Only admins can share this workspace",
        {
          workspaceUuid,
        }
      );
      return NextResponse.json(
        { error: "Only admins can share this workspace" },
        { status: 403 }
      );
    }

    const requestBody = await parseJsonRequest(request, unknownJsonRequestSchema);
    if (!requestBody.success) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }
    const parsed = workspaceShareInviteSchema.safeParse(requestBody.data);
    if (!parsed.success) {
      void apiLogger.requestFailed(400, "Missing email", { workspaceUuid });
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const requestedRole = parsed.data.role;
    const inviteRole = resolveInviteRole(requestedRole);
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

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const targetUser = await findAuthUserByEmail(normalizedEmail);
    const invite = await createWorkspaceInvitationByEmail({
      workspaceId: workspaceUuid,
      email: normalizedEmail,
      inviterUserId: user.id,
      role: inviteRole,
      expiresInDays: 7,
    });

    if (invite.status === "workspace-not-found") {
      void apiLogger.requestFailed(404, "Workspace not found", {
        workspaceUuid,
      });
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }
    if (invite.status === "invalid-email") {
      void apiLogger.requestFailed(400, "Invalid email", { workspaceUuid });
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (invite.status === "already-member") {
      if (requestedRole && targetUser) {
        const updatedMember = await updateWorkspaceMemberRoleForUser({
          role: inviteRole,
          userId: targetUser.id,
          workspaceId: workspaceUuid,
        });
        if (updatedMember.status === "updated") {
          void apiLogger.requestSucceeded(200, {
            workspaceUuid,
            emailSent: false,
            role: inviteRole,
            status: "updated",
          });
          return NextResponse.json(
            { role: inviteRole, status: "updated" },
            { status: 200 }
          );
        }
      }

      void apiLogger.requestSucceeded(200, {
        workspaceUuid,
        emailSent: false,
        status: "already-member",
        role: inviteRole,
      });
      return NextResponse.json(
        { role: inviteRole, status: "already-member" },
        { status: 200 }
      );
    }

    const workspaceName = summary.name ?? "Workspace";
    const workspaceUrl = buildWorkspaceShareUrl({
      baseUrl: resolveAppBaseUrl(request),
      rootFolderId: summary.rootFolderId ?? "",
      workspaceUuid,
    });

    let emailSent = false;
    try {
      await sendWorkspaceShareEmail({
        toEmail: normalizedEmail,
        workspaceName,
        workspaceUrl,
        sharedByName: user.name ?? undefined,
      });
      emailSent = true;
    } catch (error) {
      console.error("Failed to send workspace share email", {
        workspaceUuid,
        recipient: normalizedEmail,
        error,
      });
      void apiLogger.error("error.integration", {
        integration: "email",
        workspaceUuid,
        action: "sendWorkspaceShareEmail",
      });
    }

    void apiLogger.meter("meter.share.created", {
      resourceType: "workspace-member",
      workspaceUuid,
      emailSent,
    });
    void apiLogger.featureUsed("workspace.sharing.member.added", {
      workspaceUuid,
      emailSent,
    });
    void apiLogger.requestSucceeded(200, { workspaceUuid, emailSent });

    return NextResponse.json(
      {
        status: "invited",
        member: targetUser ?? null,
        invitationId: invite.invitationId,
        emailSent,
        role: inviteRole,
        workspaceUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    void apiLogger.requestFailed(500, error, { workspaceUuid });
    return NextResponse.json(
      {
        error: resolveWorkspaceShareMembersRouteError(
          error,
          WORKSPACE_SHARE_MEMBERS_INVITE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
