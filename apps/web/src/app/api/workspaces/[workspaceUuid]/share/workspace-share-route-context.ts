import { NextResponse } from "next/server";
import { createApiLogger } from "@/lib/observability";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";

export async function resolveWorkspaceShareRouteContext(input: {
  context: { params: Promise<{ workspaceUuid: string }> };
  request: Request;
  route: string;
}) {
  const user = await getSessionUser();
  const apiLogger = createApiLogger({
    request: input.request,
    route: input.route,
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

  const { workspaceUuid } = await input.context.params;
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
