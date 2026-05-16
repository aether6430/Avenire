import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { handleFlashcardSetsRouteGet } from "./flashcard-sets-route-get";
import { handleFlashcardSetsRoutePost } from "./flashcard-sets-route-post";

export async function GET() {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleFlashcardSetsRouteGet({
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });
}

export async function POST(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleFlashcardSetsRoutePost({
    request,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });
}
