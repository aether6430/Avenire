import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleWorkspaceRouteDelete } from "./workspace-route-delete";
import { handleWorkspaceRoutePatch } from "./workspace-route-patch";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid } = await context.params;
  return await handleWorkspaceRouteDelete({
    userId: user.id,
    workspaceUuid,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
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
}
