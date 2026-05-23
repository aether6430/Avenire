import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { handleFlashcardDashboardRouteGet } from "./flashcard-dashboard-route-get";
import {
  FLASHCARD_DASHBOARD_LOAD_ERROR,
  resolveFlashcardDashboardRouteError,
} from "./flashcard-dashboard-route-model";

export async function GET() {
  try {
    const ctx = await getWorkspaceContextForUser();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleFlashcardDashboardRouteGet({
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardDashboardRouteError(
          error,
          FLASHCARD_DASHBOARD_LOAD_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
