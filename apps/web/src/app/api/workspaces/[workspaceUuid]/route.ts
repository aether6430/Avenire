import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleWorkspaceRouteDelete } from "./workspace-route-delete";
import {
  resolveWorkspaceRouteError,
  WORKSPACE_ROUTE_DELETE_ERROR,
  WORKSPACE_ROUTE_PATCH_ERROR,
} from "./workspace-route-model";
import { handleWorkspaceRoutePatch } from "./workspace-route-patch";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceUuid } = await context.params;
    return await handleWorkspaceRouteDelete({
      userId: user.id,
      workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceRouteError(error, WORKSPACE_ROUTE_DELETE_ERROR),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceUuid } = await context.params;
    return await handleWorkspaceRoutePatch({
      request,
      userId: user.id,
      workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceRouteError(error, WORKSPACE_ROUTE_PATCH_ERROR),
      },
      { status: 500 }
    );
  }
}
