import { logInfo } from "@avenire/observability";
import {
  getCachedToolResult,
  invalidateToolResultScope,
} from "@/lib/ai-tool-result-cache";
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

const ACTIVE_MISCONCEPTIONS_CACHE_TTL_SECONDS = 60 * 5;
type ActiveMisconceptionsCacheStatus = "hit" | "miss";
const ACTIVE_MISCONCEPTION_CACHE_TOOL_NAMES = [
  "list_misconceptions",
  "misconception_signal_active_misconceptions",
] as const;

function normalizeMisconceptionField(value: string) {
  return value.trim();
}

function assertMisconceptionSeedFields(input: {
  concept: string;
  reason: string;
  subject: string;
  topic: string;
}) {
  if (!(input.concept && input.reason && input.subject && input.topic)) {
    throw new Error(
      "Misconception concept, subject, topic, and reason are required."
    );
  }
}

function assertMisconceptionScopeFields(input: {
  concept: string;
  subject: string;
  topic: string;
}) {
  if (!(input.concept && input.subject && input.topic)) {
    throw new Error("Misconception concept, subject, and topic are required.");
  }
}

function isMisconceptionRecordArray(
  value: unknown
): value is MisconceptionRecord[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof (entry as { concept?: unknown }).concept === "string" &&
        typeof (entry as { subject?: unknown }).subject === "string" &&
        typeof (entry as { topic?: unknown }).topic === "string"
    )
  );
}

async function getCachedActiveMisconceptions(input: {
  concept?: string;
  limit?: number;
  subject?: string;
  topic?: string;
  userId: string;
  workspaceId: string;
}) {
  const concept = input.concept?.trim() || undefined;
  const subject = input.subject?.trim() || undefined;
  const topic = input.topic?.trim() || undefined;

  const result = await getCachedToolResult({
    execute: () =>
      getActiveMisconceptions({
        ...input,
        concept,
        subject,
        topic,
      }),
    input: {
      concept,
      limit: input.limit,
      subject,
      topic,
    },
    scope: {
      userId: input.userId,
      workspaceId: input.workspaceId,
    },
    toolName: "list_misconceptions",
    ttlSeconds: ACTIVE_MISCONCEPTIONS_CACHE_TTL_SECONDS,
    validate: isMisconceptionRecordArray,
  });

  return {
    cache: result.cache as ActiveMisconceptionsCacheStatus,
    misconceptions: result.value,
  };
}

async function invalidateActiveMisconceptionCaches(ctx: {
  userId: string;
  workspaceId: string;
}) {
  await Promise.allSettled(
    ACTIVE_MISCONCEPTION_CACHE_TOOL_NAMES.map((toolName) =>
      invalidateToolResultScope({
        scope: {
          userId: ctx.userId,
          workspaceId: ctx.workspaceId,
        },
        toolName,
      })
    )
  );
}

export async function prewarmActiveMisconceptionsCache(params: {
  subject?: string | null;
  topic?: string | null;
  userId: string;
  workspaceId: string;
}) {
  const subject = params.subject?.trim();
  const topic = params.topic?.trim();
  if (!(subject && topic)) {
    return;
  }

  await getCachedActiveMisconceptions({
    limit: 24,
    subject,
    topic,
    userId: params.userId,
    workspaceId: params.workspaceId,
  });
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

  const { misconceptions } = await getCachedActiveMisconceptions({
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
  const concept = normalizeMisconceptionField(input.concept);
  const reason = normalizeMisconceptionField(input.reason);
  const subject = normalizeMisconceptionField(input.subject);
  const topic = normalizeMisconceptionField(input.topic);
  assertMisconceptionSeedFields({
    concept,
    reason,
    subject,
    topic,
  });

  const misconception = await upsertMisconception({
    confidence: input.confidence,
    concept,
    evidenceClass: "manual",
    reason,
    source: "chat_tool",
    sourceSessionId: ctx.chatSlug,
    subject,
    topic,
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
  await invalidateActiveMisconceptionCaches(ctx);

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
  const { cache, misconceptions } = await getCachedActiveMisconceptions({
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
        ? `Found ${misconceptions.length} active misconception(s). Cache ${cache}.`
        : `No active misconceptions found. Cache ${cache}.`,
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
  const concept = normalizeMisconceptionField(input.concept);
  const subject = normalizeMisconceptionField(input.subject);
  const topic = normalizeMisconceptionField(input.topic);
  assertMisconceptionScopeFields({
    concept,
    subject,
    topic,
  });

  const resolved = await resolveMisconceptionsForConcept({
    concept,
    subject,
    topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  await recomputeConceptMastery({
    concept,
    subject,
    topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  const remaining = await getActiveMisconceptions({
    concept,
    subject,
    topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });
  await invalidateActiveMisconceptionCaches(ctx);

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
  const concept = normalizeMisconceptionField(input.concept);
  const subject = normalizeMisconceptionField(input.subject);
  const topic = normalizeMisconceptionField(input.topic);
  assertMisconceptionScopeFields({
    concept,
    subject,
    topic,
  });

  const improved = await improveMisconceptionsForConcept({
    concept,
    decay: input.decay,
    resolveThreshold: input.resolveThreshold,
    subject,
    topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  await recomputeConceptMastery({
    concept,
    subject,
    topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  const remaining = await getActiveMisconceptions({
    concept,
    subject,
    topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });
  await invalidateActiveMisconceptionCaches(ctx);

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
  const concept = normalizeMisconceptionField(input.concept);
  const reason = normalizeMisconceptionField(input.reason);
  const subject = normalizeMisconceptionField(input.subject);
  const topic = normalizeMisconceptionField(input.topic);
  assertMisconceptionSeedFields({
    concept,
    reason,
    subject,
    topic,
  });

  const misconceptions = await getActiveMisconceptions({
    concept,
    subject,
    topic,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  return (
    misconceptions[0] ??
    ({
      active: true,
      decayedAt: null,
      confidence: 0.85,
      concept,
      createdAt: new Date().toISOString(),
      evidenceCount: 0,
      evidenceClass: "manual",
      evidenceRootId: null,
      evidenceSpan: null,
      firstSeenAt: new Date().toISOString(),
      id: "draft",
      lastSeenAt: new Date().toISOString(),
      promotedAt: new Date().toISOString(),
      reason,
      resolvedAt: null,
      source: "manual",
      sourceSessionId: null,
      status: "confirmed",
      subject,
      topic,
      updatedAt: new Date().toISOString(),
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
    } satisfies MisconceptionRecord)
  );
}
