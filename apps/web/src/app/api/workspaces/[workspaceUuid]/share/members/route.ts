import { NextResponse } from "next/server";
import { resolveWorkspaceShareRouteContext } from "../workspace-share-route-context";
import { handleWorkspaceShareMembersDelete } from "./workspace-share-members-delete";
import { handleWorkspaceShareMembersGet } from "./workspace-share-members-get";
import {
  resolveWorkspaceShareMembersRouteError,
  WORKSPACE_SHARE_MEMBERS_INVITE_ERROR,
  WORKSPACE_SHARE_MEMBERS_LIST_ERROR,
  WORKSPACE_SHARE_MEMBERS_REMOVE_ERROR,
} from "./workspace-share-members-model";
import { handleWorkspaceShareMembersPost } from "./workspace-share-members-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
    const routeContext = await resolveWorkspaceShareRouteContext({
      context,
      request,
      route: "/api/workspaces/[workspaceUuid]/share/members",
    });
    if ("response" in routeContext) {
      return routeContext.response;
    }

    return await handleWorkspaceShareMembersPost({
      apiLogger: routeContext.apiLogger,
      request,
      user: routeContext.user,
      workspaceUuid: routeContext.workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceShareMembersRouteError(
          error,
          WORKSPACE_SHARE_MEMBERS_INVITE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
    const routeContext = await resolveWorkspaceShareRouteContext({
      context,
      request,
      route: "/api/workspaces/[workspaceUuid]/share/members",
    });
    if ("response" in routeContext) {
      return routeContext.response;
    }

    return await handleWorkspaceShareMembersGet({
      apiLogger: routeContext.apiLogger,
      request,
      user: routeContext.user,
      workspaceUuid: routeContext.workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceShareMembersRouteError(
          error,
          WORKSPACE_SHARE_MEMBERS_LIST_ERROR
        ),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
    const routeContext = await resolveWorkspaceShareRouteContext({
      context,
      request,
      route: "/api/workspaces/[workspaceUuid]/share/members",
    });
    if ("response" in routeContext) {
      return routeContext.response;
    }

    return await handleWorkspaceShareMembersDelete({
      apiLogger: routeContext.apiLogger,
      request,
      user: routeContext.user,
      workspaceUuid: routeContext.workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceShareMembersRouteError(
          error,
          WORKSPACE_SHARE_MEMBERS_REMOVE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
