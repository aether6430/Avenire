import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { handleFlashcardsReviewQueueRouteGet } from "./flashcards-review-queue-route-get";
import {
  FLASHCARDS_REVIEW_QUEUE_LOAD_ERROR,
  resolveFlashcardsReviewQueueRouteError,
} from "./flashcards-review-queue-route-model";

export async function GET(request: Request) {
  try {
    const ctx = await getWorkspaceContextForUser();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleFlashcardsReviewQueueRouteGet({
      requestUrl: request.url,
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardsReviewQueueRouteError(
          error,
          FLASHCARDS_REVIEW_QUEUE_LOAD_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
