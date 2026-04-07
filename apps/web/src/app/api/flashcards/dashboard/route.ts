import { NextResponse } from "next/server";
import { getFlashcardDashboardForUser } from "@/lib/flashcards";
import { getWorkspaceContextForUser } from "@/lib/workspace";

export async function GET() {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dashboard = await getFlashcardDashboardForUser(
    ctx.user.id,
    ctx.workspace.workspaceId
  );

  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }

  return NextResponse.json({ dashboard });
}
