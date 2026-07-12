import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { parseJsonRequest } from "@/lib/api-request";
import { workspaceLinkCreateSchema } from "./workspace-links-route-model";
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
    const parsed = await parseJsonRequest(request, workspaceLinkCreateSchema);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const body = parsed.data;

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
