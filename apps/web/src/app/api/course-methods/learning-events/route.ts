import { recordCourseLearningEvent } from "@avenire/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextForUser } from "@/lib/workspace";

export const runtime = "nodejs";

const learningEventSchema = z.object({
  courseMapId: z.string().uuid(),
  courseMapNodeId: z.string().uuid(),
  courseMapVersionId: z.string().uuid(),
  courseMethodId: z.string().uuid(),
  direction: z.enum(["positive", "negative", "neutral"]),
  evidenceStrength: z.enum(["weak", "medium", "strong"]),
  observedAt: z.coerce.date().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  sourceId: z.string().nullable().optional(),
  sourceTable: z.string().trim().min(1).nullable().optional(),
  sourceType: z.string().trim().min(1),
  sprintId: z.string().uuid().nullable().optional(),
});

export async function POST(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = learningEventSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid learning event payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const event = await recordCourseLearningEvent({
    ...parsed.data,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });

  return NextResponse.json({ event }, { status: 201 });
}
