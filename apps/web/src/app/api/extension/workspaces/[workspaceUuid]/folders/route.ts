import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleExtensionWorkspaceFoldersRouteGet } from "./extension-workspace-folders-route-get";

export async function GET(
  request: Request,
  contextParams: { params: Promise<{ workspaceUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid } = await contextParams.params;
  return await handleExtensionWorkspaceFoldersRouteGet({
    request,
    userId: user.id,
    workspaceUuid,
  });
}
