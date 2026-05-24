import {
  adjustMisconceptionConfidenceForConcept,
  improveMisconceptionsForConcept,
  recomputeConceptMastery,
} from "@avenire/database";
import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import {
  parseMisconceptionImproveInput,
  resolveMisconceptionRouteError,
} from "../misconception-route-model";

export async function handleMisconceptionImproveRoutePost(input: {
  request: Request;
}) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = parseMisconceptionImproveInput(
    (await input.request.json().catch(() => ({}))) as {
      concept?: unknown;
      delta?: unknown;
      decay?: unknown;
      resolveThreshold?: unknown;
      subject?: unknown;
      topic?: unknown;
    }
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const improved =
      typeof parsed.data.delta === "number"
        ? await adjustMisconceptionConfidenceForConcept({
            concept: parsed.data.concept,
            delta: parsed.data.delta,
            subject: parsed.data.subject,
            topic: parsed.data.topic,
            userId: ctx.user.id,
            workspaceId: ctx.workspace.workspaceId,
          })
        : await improveMisconceptionsForConcept({
            concept: parsed.data.concept,
            decay: parsed.data.decay,
            resolveThreshold: parsed.data.resolveThreshold,
            subject: parsed.data.subject,
            topic: parsed.data.topic,
            userId: ctx.user.id,
            workspaceId: ctx.workspace.workspaceId,
          });

    await recomputeConceptMastery({
      concept: parsed.data.concept,
      subject: parsed.data.subject,
      topic: parsed.data.topic,
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
  } catch (error) {
    const failure = resolveMisconceptionRouteError(error, {
      fallback: "Unable to improve misconceptions.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
