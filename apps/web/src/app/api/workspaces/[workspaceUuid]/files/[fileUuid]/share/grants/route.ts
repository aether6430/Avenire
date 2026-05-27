import { resolveWorkspaceFileShareRouteContext } from "../workspace-file-share-route-context";
import {
  resolveWorkspaceFileShareRouteError,
  WORKSPACE_FILE_SHARE_CONTEXT_ERROR,
} from "../workspace-file-share-route-model";
import { handleWorkspaceFileShareGrantsPost } from "./workspace-file-share-grants-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  try {
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
  } catch (error) {
    return Response.json(
      {
        error: resolveWorkspaceFileShareRouteError(
          error,
          WORKSPACE_FILE_SHARE_CONTEXT_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
