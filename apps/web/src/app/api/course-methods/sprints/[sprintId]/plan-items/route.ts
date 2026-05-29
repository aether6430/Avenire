import { listSprintPlanItems } from "@avenire/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextForUser } from "@/lib/workspace";

export const runtime = "nodejs";

const paramsSchema = z.object({
  sprintId: z.string().uuid(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ sprintId: string }> }
) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: "Invalid sprint id" }, { status: 400 });
  }

  const planItems = await listSprintPlanItems({
    sprintId: params.data.sprintId,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });

  return NextResponse.json({ planItems });
}
