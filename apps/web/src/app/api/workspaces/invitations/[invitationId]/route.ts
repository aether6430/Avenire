import { NextResponse } from "next/server";
import { resolveWorkspaceDirectoryRouteError } from "../../workspace-directory-route-model";
import { handleWorkspaceInvitationRoutePost } from "./workspace-invitation-route-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ invitationId: string }> }
) {
  try {
    const { invitationId } = await context.params;
    return await handleWorkspaceInvitationRoutePost({
      invitationId,
      request,
    });
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
