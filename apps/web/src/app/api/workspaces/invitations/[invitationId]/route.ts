import { handleWorkspaceInvitationRoutePost } from "./workspace-invitation-route-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ invitationId: string }> }
) {
  const { invitationId } = await context.params;
  return await handleWorkspaceInvitationRoutePost({
    invitationId,
    request,
  });
}
