import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { handleActivityGet } from "./activity-route-get";

export async function GET(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleActivityGet({
    request,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });
}
