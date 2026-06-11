import { NextResponse } from "next/server";
import { invalidateFlashcardReadCaches } from "@/lib/domain-cache";
import { upsertFlashcardSetEnrollmentForUser } from "@/lib/flashcards";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { flashcardEnrollmentSchema } from "../../../flashcard-route-model";

export async function POST(
  request: Request,
  context: { params: Promise<{ setId: string }> }
) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = flashcardEnrollmentSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const body = parsed.data;
  const { setId } = await context.params;

  const enrollment = await upsertFlashcardSetEnrollmentForUser({
    newCardsPerDay: body.newCardsPerDay,
    setId,
    status: body.status,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });

  if (!enrollment) {
    return NextResponse.json({ error: "Set not found" }, { status: 404 });
  }

  await invalidateFlashcardReadCaches(ctx.workspace.workspaceId);

  return NextResponse.json({ enrollment });
}
