import { resolveWorkspaceFileShareRouteContext } from "../workspace-file-share-route-context";
import { handleWorkspaceFileShareGrantsPost } from "./workspace-file-share-grants-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  const routeContext = await resolveWorkspaceFileShareRouteContext({
    request,
    route: "/api/workspaces/[workspaceUuid]/files/[fileUuid]/share/grants",
    params: context.params,
  });
  if ("response" in routeContext) {
    return routeContext.response;
  }

  return await handleWorkspaceFileShareGrantsPost({
    ...routeContext,
    request,
  });
}
