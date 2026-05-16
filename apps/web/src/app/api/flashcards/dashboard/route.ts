import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { handleFlashcardDashboardRouteGet } from "./flashcard-dashboard-route-get";

export async function GET() {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleFlashcardDashboardRouteGet({
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });
}
