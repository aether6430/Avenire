import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import {
  FLASHCARD_SET_ENROLLMENT_UPDATE_ERROR,
  resolveFlashcardSetEnrollmentRouteError,
} from "./flashcard-set-enrollment-route-model";
import { handleFlashcardSetEnrollmentRoutePost } from "./flashcard-set-enrollment-route-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ setId: string }> }
) {
  try {
    const ctx = await getWorkspaceContextForUser();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { setId } = await context.params;
    return await handleFlashcardSetEnrollmentRoutePost({
      request,
      setId,
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardSetEnrollmentRouteError(
          error,
          FLASHCARD_SET_ENROLLMENT_UPDATE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
