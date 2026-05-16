import { handleWorkspaceListRouteGet } from "./workspace-list-route-get";

export async function GET() {
  return await handleWorkspaceListRouteGet();
}
