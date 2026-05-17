import { logInfo } from "@avenire/observability";
import {
  buildMisconceptionContext,
  MISCONCEPTION_CONTEXT_LIMIT,
  mapMisconceptionForTool,
  normalizeMisconceptionSubjectKey,
} from "@/lib/chat-tools/study-tool-helpers";
import {
  getActiveMisconceptions,
  improveMisconceptionsForConcept,
  type MisconceptionRecord,
  recomputeConceptMastery,
  resolveMisconceptionsForConcept,
  upsertMisconception,
} from "@/lib/learning-data";

interface MisconceptionRuntimeContext {
  chatSlug: string;
  userId: string;
  workspaceId: string;
}

export async function getActiveMisconceptionContext(params: {
  subject?: string | null;
  topic?: string | null;
  userId: string;
  workspaceId: string;
}) {
  const subject = params.subject?.trim();
  const topic = params.topic?.trim();
  if (!(subject && topic)) {
    return null;
  }

  const misconceptions = await getActiveMisconceptions({
    limit: 24,
    subject,
    topic,
    userId: params.userId,
    workspaceId: params.workspaceId,
  });
  const active = misconceptions
    .filter(
      (misconception) =>
        normalizeMisconceptionSubjectKey(misconception.subject) ===
        normalizeMisconceptionSubjectKey(subject)
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, MISCONCEPTION_CONTEXT_LIMIT);

  if (active.length > 0) {
    logInfo({
      eventName: "misconception.confirmed.injected",
      payload: {
        activeCount: active.length,
        subject,
        topic,
        userId: params.userId,
        workspaceId: params.workspaceId,
      },
    });
  }

  return buildMisconceptionContext(active);
}

export async function logMisconceptionForTool(
  ctx: MisconceptionRuntimeContext,
  input: {
    concept: string;
    confidence: number;
    reason: string;
    subject: string;
    topic: string;
  }
) {
  const misconception = await upsertMisconception({
    confidence: input.confidence,
    concept: input.concept,
    evidenceClass: "manual",
    reason: input.reason,
    source: "chat_tool",
    sourceSessionId: ctx.chatSlug,
    subject: input.subject,
    topic: input.topic,
    status: "confirmed",
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });
  const activeMisconceptions = await getActiveMisconceptions({
    concept: misconception.concept,
    subject: misconception.subject,
    topic: misconception.topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  return {
    activeMisconceptionsCount: activeMisconceptions.length,
    misconception: mapMisconceptionForTool(misconception),
    summary: `Stored misconception for ${misconception.concept}`,
  };
}

export async function listMisconceptionsForTool(
  ctx: MisconceptionRuntimeContext,
  input: {
    concept?: string;
    limit?: number;
    subject?: string;
    topic?: string;
  }
) {
  const misconceptions = await getActiveMisconceptions({
    concept: input.concept,
    limit: input.limit,
    subject: input.subject,
    topic: input.topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  return {
    count: misconceptions.length,
    misconceptions: misconceptions.map(mapMisconceptionForTool),
    summary:
      misconceptions.length > 0
        ? `Found ${misconceptions.length} active misconception(s).`
        : "No active misconceptions found.",
  };
}

export async function resolveMisconceptionForTool(
  ctx: MisconceptionRuntimeContext,
  input: {
    concept: string;
    subject: string;
    topic: string;
  }
) {
  const resolved = await resolveMisconceptionsForConcept({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  await recomputeConceptMastery({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  const remaining = await getActiveMisconceptions({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  return {
    remainingActiveCount: remaining.length,
    resolvedCount: resolved.length,
    summary:
      resolved.length > 0
        ? `Resolved ${resolved.length} misconception(s).`
        : "No active misconception matched that concept.",
  };
}

export async function improveMisconceptionForTool(
  ctx: MisconceptionRuntimeContext,
  input: {
    concept: string;
    decay?: number;
    resolveThreshold?: number;
    subject: string;
    topic: string;
  }
) {
  const improved = await improveMisconceptionsForConcept({
    concept: input.concept,
    decay: input.decay,
    resolveThreshold: input.resolveThreshold,
    subject: input.subject,
    topic: input.topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  await recomputeConceptMastery({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  const remaining = await getActiveMisconceptions({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  const resolvedCount = improved.filter((item) => !item.active).length;

  return {
    improvedCount: improved.length,
    remainingActiveCount: remaining.length,
    resolvedCount,
    summary:
      improved.length > 0
        ? `Improved ${improved.length} misconception(s).`
        : "No active misconception matched that concept.",
  };
}

export async function resolveMisconceptionSeed(
  ctx: MisconceptionRuntimeContext,
  input: {
    concept: string;
    reason: string;
    subject: string;
    topic: string;
  }
) {
  const misconceptions = await getActiveMisconceptions({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  return (
    misconceptions[0] ??
    ({
      active: true,
      decayedAt: null,
      confidence: 0.85,
      concept: input.concept,
      createdAt: new Date().toISOString(),
      evidenceCount: 0,
      evidenceClass: "manual",
      evidenceRootId: null,
      evidenceSpan: null,
      firstSeenAt: new Date().toISOString(),
      id: "draft",
      lastSeenAt: new Date().toISOString(),
      promotedAt: new Date().toISOString(),
      reason: input.reason,
      resolvedAt: null,
      source: "manual",
      sourceSessionId: null,
      status: "confirmed",
      subject: input.subject,
      topic: input.topic,
      updatedAt: new Date().toISOString(),
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
    } satisfies MisconceptionRecord)
  );
}
