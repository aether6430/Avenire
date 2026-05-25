import { NextResponse } from "next/server";
import { resolveWorkspaceShareRouteContext } from "../workspace-share-route-context";
import {
  resolveWorkspaceShareTeamRouteError,
  WORKSPACE_SHARE_TEAM_ERROR,
} from "./workspace-share-team-model";
import { handleWorkspaceShareTeamPost } from "./workspace-share-team-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
    const routeContext = await resolveWorkspaceShareRouteContext({
      context,
      request,
      route: "/api/workspaces/[workspaceUuid]/share/team",
    });
    if ("response" in routeContext) {
      return routeContext.response;
    }

    return await handleWorkspaceShareTeamPost({
      apiLogger: routeContext.apiLogger,
      request,
      user: routeContext.user,
      workspaceUuid: routeContext.workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceShareTeamRouteError(
          error,
          WORKSPACE_SHARE_TEAM_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
