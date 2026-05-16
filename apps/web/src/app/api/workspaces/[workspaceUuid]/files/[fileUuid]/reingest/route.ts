import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleWorkspaceFileReingestPost } from "./workspace-file-reingest-route-post";

export async function POST(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid, fileUuid } = await context.params;
  return await handleWorkspaceFileReingestPost({
    fileUuid,
    userId: user.id,
    workspaceUuid,
  });
}
