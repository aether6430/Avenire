import { resolveWorkspaceFileShareRouteContext } from "../workspace-file-share-route-context";
import { handleWorkspaceFileShareLinkPost } from "./workspace-file-share-link-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  const routeContext = await resolveWorkspaceFileShareRouteContext({
    request,
    params: context.params,
    route: "/api/workspaces/[workspaceUuid]/files/[fileUuid]/share/link",
  });
  if ("response" in routeContext) {
    return routeContext.response;
  }

  return await handleWorkspaceFileShareLinkPost({
    ...routeContext,
    request,
  });
}
