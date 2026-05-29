import { getCourseMethodOverview } from "@avenire/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextForUser } from "@/lib/workspace";

export const runtime = "nodejs";

const paramsSchema = z.object({
  methodId: z.string().uuid(),
});

const presetSchema = z
  .enum(["balanced", "exam_sprint", "mastery", "weakness_repair"])
  .optional();

export async function GET(
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

  const { searchParams } = new URL(request.url);
  const preset = presetSchema.parse(searchParams.get("preset") ?? undefined);
  const overview = await getCourseMethodOverview({
    methodId: params.data.methodId,
    preset,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });

  if (!overview) {
    return NextResponse.json(
      { error: "Course method not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ overview });
}
