import { NextResponse } from "next/server";
import { resolveWorkspaceShareRouteContext } from "../workspace-share-route-context";
import { handleWorkspaceShareSuggestionsRouteGet } from "./workspace-share-suggestions-route-get";
import {
  resolveWorkspaceShareSuggestionsRouteError,
  WORKSPACE_SHARE_SUGGESTIONS_ERROR,
} from "./workspace-share-suggestions-route-model";

export async function GET(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
    const routeContext = await resolveWorkspaceShareRouteContext({
      context,
      request,
      route: "/api/workspaces/[workspaceUuid]/share/suggestions",
    });
    if ("response" in routeContext) {
      return routeContext.response;
    }

    return await handleWorkspaceShareSuggestionsRouteGet({
      request,
      user: routeContext.user,
      workspaceUuid: routeContext.workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceShareSuggestionsRouteError(
          error,
          WORKSPACE_SHARE_SUGGESTIONS_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
