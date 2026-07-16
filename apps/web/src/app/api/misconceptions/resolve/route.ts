import {
  recomputeConceptMastery,
  resolveMisconceptionsForConcept,
} from "@avenire/database";
import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api-request";
import { invalidateActiveMisconceptionCaches } from "@/lib/misconception-cache";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { misconceptionScopeSchema } from "../misconception-route-model";

export async function POST(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonRequest(request, misconceptionScopeSchema);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Concept, subject, and topic are required" },
      { status: 400 }
    );
  }
  const { concept, subject, topic } = parsed.data;

  const resolved = await resolveMisconceptionsForConcept({
    concept,
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
      resolvedCount: resolved.length,
    },
    { status: 200 }
  );
}
