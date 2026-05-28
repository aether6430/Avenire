import { commitSprintPlanItemToTask } from "@avenire/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateTaskListCache } from "@/lib/tasks-cache";
import { getWorkspaceContextForUser } from "@/lib/workspace";

export const runtime = "nodejs";
export const maxDuration = 60;

const paramsSchema = z.object({
  planItemId: z.string().uuid(),
});

export async function POST(
  _request: Request,
  context: { params: Promise<{ planItemId: string }> }
) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json(
      { error: "Invalid plan item id" },
      { status: 400 }
    );
  }

  try {
    const task = await commitSprintPlanItemToTask({
      planItemId: params.data.planItemId,
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });

    if (!task) {
      return NextResponse.json(
        { error: "Plan item not found" },
        { status: 404 }
      );
    }

    await invalidateTaskListCache(ctx.workspace.workspaceId);

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to commit plan item.",
      },
      { status: 400 }
    );
  }
}
