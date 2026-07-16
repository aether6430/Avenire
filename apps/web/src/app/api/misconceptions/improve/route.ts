import {
  adjustMisconceptionConfidenceForConcept,
  improveMisconceptionsForConcept,
  recomputeConceptMastery,
} from "@avenire/database";
import { Exit, Schema } from "effect-v4";
import { NextResponse } from "next/server";
import { parseJsonRequest, unknownJsonRequestSchema } from "@/lib/api-request";
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

  const body = await parseJsonRequest(request, unknownJsonRequestSchema);
  if (!body.success) {
    return NextResponse.json(
      { error: "Concept, subject, and topic are required" },
      { status: 400 }
    );
  }

  const parsed = Schema.decodeUnknownExit(misconceptionImproveSchema)(
    body.data
  );
  if (Exit.isFailure(parsed)) {
    const scope = Schema.decodeUnknownExit(misconceptionScopeSchema)(body.data);
    if (Exit.isSuccess(scope)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Concept, subject, and topic are required" },
      { status: 400 }
    );
  }
  const { concept, decay, delta, resolveThreshold, subject, topic } =
    parsed.value;

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
