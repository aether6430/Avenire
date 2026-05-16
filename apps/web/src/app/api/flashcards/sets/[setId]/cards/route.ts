import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { handleFlashcardSetCardsRoutePost } from "./flashcard-set-cards-route-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ setId: string }> }
) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { setId } = await context.params;
  return await handleFlashcardSetCardsRoutePost({
    request,
    setId,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });
}
