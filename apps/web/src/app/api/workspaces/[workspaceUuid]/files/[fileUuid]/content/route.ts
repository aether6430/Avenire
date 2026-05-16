import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import {
  handleWorkspaceFileContentPatch,
  type WorkspaceFileContentRouteBody,
} from "./workspace-file-content-route-patch";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid, fileUuid } = await context.params;
  const body = (await request
    .json()
    .catch(() => ({}))) as WorkspaceFileContentRouteBody;

  return await handleWorkspaceFileContentPatch({
    body,
    fileUuid,
    userId: user.id,
    workspaceUuid,
  });
}
