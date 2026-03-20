import { recomputeConceptMastery, resolveMisconceptionsForConcept } from "@avenire/database";
import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    concept?: unknown;
    subject?: unknown;
    topic?: unknown;
  };

  const concept = normalizeText(body.concept);
  const subject = normalizeText(body.subject);
  const topic = normalizeText(body.topic);

  if (!(concept && subject && topic)) {
    return NextResponse.json(
      { error: "Concept, subject, and topic are required" },
      { status: 400 }
    );
  }

  const resolved = await resolveMisconceptionsForConcept({
    concept,
    subject,
    topic,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });

  await recomputeConceptMastery({
    concept,
    reviewedAt: new Date(),
    subject,
    topic,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });

  return NextResponse.json(
    {
      resolvedCount: resolved.length,
    },
    { status: 200 }
  );
}
