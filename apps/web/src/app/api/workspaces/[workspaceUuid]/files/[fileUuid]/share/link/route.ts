import { resolveWorkspaceFileShareRouteContext } from "../workspace-file-share-route-context";
import {
  resolveWorkspaceFileShareRouteError,
  WORKSPACE_FILE_SHARE_CONTEXT_ERROR,
} from "../workspace-file-share-route-model";
import { handleWorkspaceFileShareLinkPost } from "./workspace-file-share-link-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  try {
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
