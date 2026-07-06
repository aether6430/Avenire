import {
  adjustMisconceptionConfidenceForConcept,
  improveMisconceptionsForConcept,
  recomputeConceptMastery,
} from "@avenire/database";
import { NextResponse } from "next/server";
import { invalidateActiveMisconceptionCaches } from "@/lib/misconception-cache";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import {
  misconceptionImproveSchema,
  misconceptionScopeSchema,
} from "../misconception-route-model";

export async function POST(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = misconceptionImproveSchema.safeParse(payload);
  if (!parsed.success) {
    if (misconceptionScopeSchema.safeParse(payload).success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Concept, subject, and topic are required" },
      { status: 400 }
    );
  }
  const { concept, decay, delta, resolveThreshold, subject, topic } =
    parsed.data;

  const improved =
    typeof delta === "number"
      ? await adjustMisconceptionConfidenceForConcept({
          concept,
          delta,
          subject,
          topic,
          userId: ctx.user.id,
          workspaceId: ctx.workspace.workspaceId,
        })
      : await improveMisconceptionsForConcept({
          concept,
          decay,
          resolveThreshold,
          subject,
          topic,
          userId: ctx.user.id,
          workspaceId: ctx.workspace.workspaceId,
        });

  await recomputeConceptMastery({
    concept,
    subject,
    topic,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });

  await invalidateActiveMisconceptionCaches({
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
