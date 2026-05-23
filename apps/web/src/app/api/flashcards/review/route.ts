import { NextResponse } from "next/server";
import "@/lib/learning-automation";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import {
  FLASHCARDS_REVIEW_ERROR,
  resolveFlashcardsReviewRouteError,
} from "./flashcards-review-route-model";
import { handleFlashcardsReviewRoutePost } from "./flashcards-review-route-post";

export async function POST(request: Request) {
  try {
    const ctx = await getWorkspaceContextForUser();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleFlashcardsReviewRoutePost({
      request,
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardsReviewRouteError(
          error,
          FLASHCARDS_REVIEW_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
