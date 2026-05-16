import { resolveWorkspaceFolderShareRouteContext } from "../workspace-folder-share-route-context";
import { handleWorkspaceFolderShareGrantsPost } from "./workspace-folder-share-grants-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string; folderUuid: string }> }
) {
  const routeContext = await resolveWorkspaceFolderShareRouteContext({
    request,
    params: context.params,
    route: "/api/workspaces/[workspaceUuid]/folders/[folderUuid]/share/grants",
  });
  if ("response" in routeContext) {
    return routeContext.response;
  }

  return await handleWorkspaceFolderShareGrantsPost({
    ...routeContext,
    request,
  });
}
