import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { handleFlashcardsOnboardingRoutePost } from "./flashcards-onboarding-route-post";

export async function POST(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleFlashcardsOnboardingRoutePost({
    request,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });
}
