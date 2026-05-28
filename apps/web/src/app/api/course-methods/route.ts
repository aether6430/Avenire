import {
  createCourseMethod,
  listCourseMethodsForUser,
  type CourseMapNodeInput,
  type CourseSourceRef,
} from "@avenire/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextForUser } from "@/lib/workspace";

export const runtime = "nodejs";
export const maxDuration = 60;

const sourceRefSchema = z
  .object({
    id: z.string().optional(),
    label: z.string().optional(),
    type: z.enum(["file", "folder", "chat", "note", "manual", "url"]),
  })
  .catchall(z.unknown());

const nodeSchema = z.object({
  difficulty: z.number().min(0).max(1).nullable().optional(),
  estimatedEffortMinutes: z.number().int().positive().nullable().optional(),
  examWeight: z.number().min(0).default(0),
  groundingState: z
    .enum([
      "ai_suggested",
      "needs_review",
      "user_verified",
      "user_added",
      "ignored",
    ])
    .default("needs_review"),
  id: z.string().uuid().optional(),
  nodeType: z
    .enum(["module", "topic", "subtopic", "skill", "exam_section"])
    .default("topic"),
  parentId: z.string().uuid().nullable().optional(),
  prerequisiteNodeIds: z.array(z.string().uuid()).default([]),
  sortOrder: z.number().int().nonnegative().optional(),
  sourceRefs: z.array(sourceRefSchema).default([]),
  taxonomyConcept: z.string().trim().min(1).nullable().optional(),
  taxonomySubject: z.string().trim().min(1).nullable().optional(),
  taxonomyTopic: z.string().trim().min(1).nullable().optional(),
  title: z.string().trim().min(1),
  userPriority: z.number().min(0).default(0),
  verificationState: z
    .enum([
      "ai_suggested",
      "needs_review",
      "user_verified",
      "user_added",
      "ignored",
    ])
    .default("needs_review"),
});

const createCourseSchema = z.object({
  nodes: z.array(nodeSchema).min(1),
  settings: z.record(z.string(), z.unknown()).optional(),
  sourceRefs: z.array(sourceRefSchema).default([]),
  subject: z.string().trim().min(1).nullable().optional(),
  title: z.string().trim().min(1),
});

export async function GET() {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const methods = await listCourseMethodsForUser({
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });

  return NextResponse.json({ methods });
}

export async function POST(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createCourseSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid course method payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const course = await createCourseMethod({
    nodes: parsed.data.nodes as CourseMapNodeInput[],
    settings: parsed.data.settings,
    sourceRefs: parsed.data.sourceRefs as CourseSourceRef[],
    subject: parsed.data.subject ?? null,
    title: parsed.data.title,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });

  return NextResponse.json({ course }, { status: 201 });
}
