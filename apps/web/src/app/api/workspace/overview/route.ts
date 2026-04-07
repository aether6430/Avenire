import { NextResponse } from "next/server";
import {
  getFlashcardDashboardForUser,
  getWeakestConcepts,
  listFlashcardSetSummariesForUser,
  resolveWeakestConceptDrillTarget,
} from "@/lib/flashcards";
import { getActiveMisconceptions } from "@/lib/learning-data";
import { getWorkspaceContextForUser } from "@/lib/workspace";

export async function GET(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedSubject = searchParams.get("subject")?.trim() || undefined;

  const [
    flashcardSets,
    weakestConcepts,
    activeMisconceptions,
    flashcardDashboard,
  ] = await Promise.all([
    listFlashcardSetSummariesForUser(ctx.user.id, ctx.workspace.workspaceId),
    getWeakestConcepts(ctx.user.id, ctx.workspace.workspaceId, {
      limit: 5,
      subject: requestedSubject,
    }).catch((error) => {
      console.error("[workspace-overview] Failed to load weakest concepts", {
        error,
        requestedSubject,
        userId: ctx.user.id,
        workspaceId: ctx.workspace.workspaceId,
      });
      return [];
    }),
    getActiveMisconceptions({
      limit: 12,
      subject: requestedSubject,
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    }).catch((error) => {
      console.error(
        "[workspace-overview] Failed to load active misconceptions",
        {
          error,
          userId: ctx.user.id,
          workspaceId: ctx.workspace.workspaceId,
        }
      );
      return [];
    }),
    getFlashcardDashboardForUser(ctx.user.id, ctx.workspace.workspaceId).catch(
      (error) => {
        console.error(
          "[workspace-overview] Failed to load flashcard dashboard data",
          {
            error,
            userId: ctx.user.id,
            workspaceId: ctx.workspace.workspaceId,
          }
        );
        return null;
      }
    ),
  ]);

  return NextResponse.json({
    activeMisconceptions,
    flashcardSets,
    weakestConcepts,
    weakestDrillTarget: flashcardDashboard
      ? resolveWeakestConceptDrillTarget(flashcardDashboard, weakestConcepts)
      : null,
  });
}
