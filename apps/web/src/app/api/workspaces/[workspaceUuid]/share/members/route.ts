import { NextResponse } from "next/server";
import { createApiLogger } from "@/lib/observability";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";
import { handleWorkspaceShareMembersDelete } from "./workspace-share-members-delete";
import { handleWorkspaceShareMembersGet } from "./workspace-share-members-get";
import { handleWorkspaceShareMembersPost } from "./workspace-share-members-post";

async function resolveWorkspaceShareRouteContext(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  const user = await getSessionUser();
  const apiLogger = createApiLogger({
    request,
    route: "/api/workspaces/[workspaceUuid]/share/members",
    feature: "workspace-sharing",
    userId: user?.id ?? null,
  });
  void apiLogger.requestStarted();

  if (!user) {
    void apiLogger.requestFailed(401, "Unauthorized");
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { workspaceUuid } = await context.params;
  const canAccess = await ensureWorkspaceAccessForUser(user.id, workspaceUuid);
  if (!canAccess) {
    void apiLogger.requestFailed(403, "Forbidden", { workspaceUuid });
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    apiLogger,
    user,
    workspaceUuid,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  const routeContext = await resolveWorkspaceShareRouteContext(
    request,
    context
  );
  if ("response" in routeContext) {
    return routeContext.response;
  }

  return await handleWorkspaceShareMembersPost({
    apiLogger: routeContext.apiLogger,
    request,
    user: routeContext.user,
    workspaceUuid: routeContext.workspaceUuid,
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  const routeContext = await resolveWorkspaceShareRouteContext(
    request,
    context
  );
  if ("response" in routeContext) {
    return routeContext.response;
  }

  return await handleWorkspaceShareMembersGet({
    apiLogger: routeContext.apiLogger,
    request,
    user: routeContext.user,
    workspaceUuid: routeContext.workspaceUuid,
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  const routeContext = await resolveWorkspaceShareRouteContext(
    request,
    context
  );
  if ("response" in routeContext) {
    return routeContext.response;
  }

  return await handleWorkspaceShareMembersDelete({
    apiLogger: routeContext.apiLogger,
    request,
    user: routeContext.user,
    workspaceUuid: routeContext.workspaceUuid,
  });
}
