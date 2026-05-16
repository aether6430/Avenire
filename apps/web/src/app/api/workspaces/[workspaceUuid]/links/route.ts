import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleWorkspaceLinksPost } from "./workspace-links-route-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    folderId?: string;
    name?: string;
    url?: string;
  };

  return await handleWorkspaceLinksPost({
    body,
    userId: user.id,
    workspaceUuid,
  });
}
