import { NextResponse } from "next/server";
import {
  listWorkspacesForUser,
  respondToInvitationForUser,
} from "@/lib/file-data";
import { getSessionUser } from "@/lib/workspace";
import {
  parseWorkspaceInvitationAction,
  resolveWorkspaceDirectoryRouteError,
} from "../../workspace-directory-route-model";

export async function handleWorkspaceInvitationRoutePost(input: {
  invitationId: string;
  request: Request;
}) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = parseWorkspaceInvitationAction(
      (await input.request.json().catch(() => ({}))) as { action?: unknown },
      input.invitationId
    );
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const result = await respondToInvitationForUser({
      invitationId: parsed.data.invitationId,
      userId: sessionUser.id,
      userEmail: sessionUser.email,
      action: parsed.data.action,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (result.action === "accepted") {
      let workspace:
        | Awaited<ReturnType<typeof listWorkspacesForUser>>[number]
        | null = null;

      try {
        const workspaces = await listWorkspacesForUser(sessionUser.id);
        workspace =
          workspaces.find((item) => item.workspaceId === result.workspaceId) ??
          null;
      } catch {
        workspace = null;
      }

      return NextResponse.json({
        ...result,
        workspace,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const failure = resolveWorkspaceDirectoryRouteError(error, {
      fallback: "Unable to respond to invitation.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
