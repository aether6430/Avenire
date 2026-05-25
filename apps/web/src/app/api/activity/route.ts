import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { handleActivityGet } from "./activity-route-get";
import {
  ACTIVITY_ROUTE_LOAD_ERROR,
  resolveActivityRouteError,
} from "./activity-route-model";

export async function GET(request: Request) {
  try {
    const ctx = await getWorkspaceContextForUser();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleActivityGet({
      request,
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveActivityRouteError(error, ACTIVITY_ROUTE_LOAD_ERROR),
      },
      { status: 500 }
    );
  }
}
