import { auth, sendWorkspaceShareEmail } from "@avenire/auth/server";
import { headers } from "next/headers";
import { after, NextResponse } from "next/server";
import { resolveAppBaseUrl } from "@/lib/app-base-url";
import { listWorkspacesForUser } from "@/lib/file-data";
import type { createApiLogger } from "@/lib/observability";
import {
  buildWorkspaceShareUrl,
  canManageWorkspaceMembers,
  normalizeOrganizationMembers,
} from "../members/workspace-share-members-model";
import { buildWorkspaceTeamRecipients } from "./workspace-share-team-model";

interface HandleWorkspaceShareTeamPostOptions {
  apiLogger: ReturnType<typeof createApiLogger>;
  request: Request;
  user: {
    id: string;
    name?: string | null;
  };
  workspaceUuid: string;
}

export async function handleWorkspaceShareTeamPost({
  apiLogger,
  request,
  user,
  workspaceUuid,
}: HandleWorkspaceShareTeamPostOptions) {
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
  const members = normalizeOrganizationMembers(membersResult);
  const currentMember = members.find((member) => member.userId === user.id);
  if (!canManageWorkspaceMembers(currentMember?.role)) {
    void apiLogger.requestFailed(403, "Only admins can share this workspace", {
      workspaceUuid,
    });
    return NextResponse.json(
      { error: "Only admins can share this workspace" },
      { status: 403 }
    );
  }

  const workspaceUrl = buildWorkspaceShareUrl({
    baseUrl: resolveAppBaseUrl(request),
    rootFolderId: summary.rootFolderId ?? "",
    workspaceUuid,
  });
  const workspaceName = summary.name ?? "Workspace";
  const recipients = buildWorkspaceTeamRecipients({
    currentUserId: user.id,
    membersResult,
  });

  after(async () => {
    let emailSentCount = 0;
    await Promise.all(
      recipients.map(async (member) => {
        try {
          await sendWorkspaceShareEmail({
            toEmail: member.email,
            workspaceName,
            workspaceUrl,
            sharedByName: user.name ?? undefined,
          });
          emailSentCount += 1;
        } catch (error) {
          const errorSummary =
            error instanceof Error
              ? { name: error.name, message: error.message }
              : { value: String(error) };
          console.error("Failed to send workspace share team email", {
            workspaceUuid,
            recipient: member.email,
            error: errorSummary,
          });
          void apiLogger.error("error.integration", {
            integration: "email",
            workspaceUuid,
            action: "sendWorkspaceShareEmail",
          });
        }
      })
    );

    void apiLogger.meter("meter.share.created", {
      resourceType: "workspace-team",
      workspaceUuid,
      recipients: recipients.length,
      emailSentCount,
    });
    void apiLogger.featureUsed("workspace.sharing.team", {
      workspaceUuid,
      recipients: recipients.length,
      emailSentCount,
    });
  });

  void apiLogger.requestSucceeded(200, {
    workspaceUuid,
    recipients: recipients.length,
    queued: true,
  });

  return NextResponse.json({
    recipients: recipients.length,
    queued: true,
    workspaceUrl,
  });
}
