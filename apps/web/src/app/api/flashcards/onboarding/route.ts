import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import {
  FLASHCARDS_ONBOARDING_ERROR,
  resolveFlashcardsOnboardingRouteError,
} from "./flashcards-onboarding-route-model";
import { handleFlashcardsOnboardingRoutePost } from "./flashcards-onboarding-route-post";

export async function POST(request: Request) {
  try {
    const ctx = await getWorkspaceContextForUser();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleFlashcardsOnboardingRoutePost({
      request,
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardsOnboardingRouteError(
          error,
          FLASHCARDS_ONBOARDING_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
