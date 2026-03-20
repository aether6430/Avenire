import {
  improveMisconceptionsForConcept,
  recomputeConceptMastery,
} from "@avenire/database";
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
    decay?: unknown;
    resolveThreshold?: unknown;
    subject?: unknown;
    topic?: unknown;
  };

  const concept = normalizeText(body.concept);
  const subject = normalizeText(body.subject);
  const topic = normalizeText(body.topic);
  const decayRaw =
    typeof body.decay === "number" ? body.decay : Number(body.decay);
  const resolveThresholdRaw =
    typeof body.resolveThreshold === "number"
      ? body.resolveThreshold
      : Number(body.resolveThreshold);

  if (!(concept && subject && topic)) {
    return NextResponse.json(
      { error: "Concept, subject, and topic are required" },
      { status: 400 }
    );
  }

  const improved = await improveMisconceptionsForConcept({
    concept,
    decay: Number.isFinite(decayRaw) ? decayRaw : undefined,
    resolveThreshold: Number.isFinite(resolveThresholdRaw)
      ? resolveThresholdRaw
      : undefined,
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
      improvedCount: improved.length,
      resolvedCount: improved.filter((item) => !item.active).length,
    },
    { status: 200 }
  );
}
