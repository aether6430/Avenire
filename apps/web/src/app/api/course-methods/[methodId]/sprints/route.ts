import { getCourseMethodOverview, startStudySprint } from "@avenire/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextForUser } from "@/lib/workspace";

export const runtime = "nodejs";
export const maxDuration = 60;

const paramsSchema = z.object({
  methodId: z.string().uuid(),
});

const startSprintSchema = z.object({
  dailyTimeBudgetMinutes: z.number().int().positive().max(720).default(60),
  deadline: z.coerce.date(),
  targetReadiness: z.number().min(0).max(1).default(0.8),
  title: z.string().trim().min(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ methodId: string }> }
) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: "Invalid method id" }, { status: 400 });
  }

  const parsed = startSprintSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid sprint payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const overview = await getCourseMethodOverview({
    methodId: params.data.methodId,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });
  const courseMapId = overview?.method.courseMapId;
  const courseMapVersionId = overview?.method.currentVersionId;
  if (!courseMapId || !courseMapVersionId) {
    return NextResponse.json(
      { error: "Course method not found" },
      { status: 404 }
    );
  }

  try {
    const sprint = await startStudySprint({
      courseMapId,
      courseMapVersionId,
      dailyTimeBudgetMinutes: parsed.data.dailyTimeBudgetMinutes,
      deadline: parsed.data.deadline,
      targetReadiness: parsed.data.targetReadiness,
      title: parsed.data.title,
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });

    return NextResponse.json({ sprint }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to start sprint.",
      },
      { status: 400 }
    );
  }
}
