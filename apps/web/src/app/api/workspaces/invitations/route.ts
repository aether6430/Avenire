import { handleWorkspaceInvitationsRouteGet } from "./workspace-invitations-route-get";

export async function GET() {
  return await handleWorkspaceInvitationsRouteGet();
}
