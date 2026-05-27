import { resolveWorkspaceFolderShareRouteContext } from "../workspace-folder-share-route-context";
import {
  resolveWorkspaceFolderShareRouteError,
  WORKSPACE_FOLDER_SHARE_CONTEXT_ERROR,
} from "../workspace-folder-share-route-model";
import { handleWorkspaceFolderShareLinkPost } from "./workspace-folder-share-link-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string; folderUuid: string }> }
) {
  try {
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
  } catch (error) {
    return Response.json(
      {
        error: resolveWorkspaceFolderShareRouteError(
          error,
          WORKSPACE_FOLDER_SHARE_CONTEXT_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
