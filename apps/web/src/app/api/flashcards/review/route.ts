import { NextResponse } from "next/server";
import "@/lib/learning-automation";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { handleFlashcardsReviewRoutePost } from "./flashcards-review-route-post";

export async function POST(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleFlashcardsReviewRoutePost({
    request,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });
}
