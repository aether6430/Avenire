import { resolveWorkspaceFolderShareRouteContext } from "../workspace-folder-share-route-context";
import { handleWorkspaceFolderShareLinkPost } from "./workspace-folder-share-link-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string; folderUuid: string }> }
) {
  const routeContext = await resolveWorkspaceFolderShareRouteContext({
    request,
    params: context.params,
    route: "/api/workspaces/[workspaceUuid]/folders/[folderUuid]/share/link",
  });
  if ("response" in routeContext) {
    return routeContext.response;
  }

  return await handleWorkspaceFolderShareLinkPost({
    ...routeContext,
    request,
  });
}
