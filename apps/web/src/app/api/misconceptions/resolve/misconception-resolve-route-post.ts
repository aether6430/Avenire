import {
  recomputeConceptMastery,
  resolveMisconceptionsForConcept,
} from "@avenire/database";
import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import {
  parseMisconceptionResolveInput,
  resolveMisconceptionRouteError,
} from "../misconception-route-model";

export async function handleMisconceptionResolveRoutePost(input: {
  request: Request;
}) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = parseMisconceptionResolveInput(
    (await input.request.json().catch(() => ({}))) as {
      concept?: unknown;
      subject?: unknown;
      topic?: unknown;
    }
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const resolved = await resolveMisconceptionsForConcept({
      ...parsed.data,
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
        resolvedCount: resolved.length,
      },
      { status: 200 }
    );
  } catch (error) {
    const failure = resolveMisconceptionRouteError(error, {
      fallback: "Unable to resolve misconceptions.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
