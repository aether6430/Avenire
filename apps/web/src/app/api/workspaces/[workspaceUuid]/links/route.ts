import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { resolveWorkspaceLinksRouteError } from "./workspace-links-route-model";
import { handleWorkspaceLinksPost } from "./workspace-links-route-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
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
  } catch (error) {
    return NextResponse.json(
      { error: resolveWorkspaceLinksRouteError(error) },
      { status: 500 }
    );
  }
}
