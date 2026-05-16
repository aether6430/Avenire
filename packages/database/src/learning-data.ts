import { logInfo } from "@avenire/observability";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "./client";
import type { FlashcardRating } from "./flashcard-fsrs";
import {
  canonicalizeLearningTaxonomy,
  canonicalizeSubjectLabel,
} from "./learning-taxonomy";
import {
  conceptMastery,
  flashcardCard,
  flashcardReviewLog,
  flashcardReviewState,
  flashcardSet,
  misconception,
  misconceptionEvidence,
} from "./schema";

export type MisconceptionSource = "manual" | "review" | "tool" | "auto";
export type MisconceptionStatus =
  | "candidate"
  | "confirmed"
  | "decayed"
  | "resolved";
export type MisconceptionEvidenceClass =
  | "manual"
  | "review"
  | "session"
  | "tool";

export interface MisconceptionRecord {
  active: boolean;
  concept: string;
  confidence: number;
  createdAt: string;
  decayedAt: string | null;
  evidenceClass: string;
  evidenceCount: number;
  evidenceRootId: string | null;
  evidenceSpan: unknown | null;
  firstSeenAt: string;
  id: string;
  lastSeenAt: string;
  promotedAt: string | null;
  reason: string;
  resolvedAt: string | null;
  source: string;
  sourceSessionId: string | null;
  status: MisconceptionStatus;
  subject: string;
  topic: string;
  updatedAt: string;
  userId: string;
  workspaceId: string;
}

export interface ConceptMasteryRecord {
  activeMisconceptionCount: number;
  concept: string;
  createdAt: string;
  id: string;
  lastMisconceptionAt: string | null;
  lastReviewedAt: string | null;
  negativeReviewCount: number;
  positiveReviewCount: number;
  reviewCount: number;
  score: number;
  subject: string;
  topic: string;
  updatedAt: string;
  userId: string;
  workspaceId: string;
}

export interface ConceptMasterySubjectRecord {
  activeMisconceptionCount: number;
  averageScore: number;
  conceptCount: number;
  lastReviewedAt: string | null;
  reviewCount: number;
  subject: string;
}

export interface UpsertMisconceptionInput {
  concept: string;
  confidence?: number;
  evidenceClass?: MisconceptionEvidenceClass | string;
  evidenceRootId?: string | null;
  evidenceSpan?: Record<string, unknown> | null;
  observedAt?: Date;
  reason: string;
  source?: MisconceptionSource | string;
  sourceSessionId?: string | null;
  status?: MisconceptionStatus;
  subject: string;
  topic: string;
  userId: string;
  workspaceId: string;
}

export interface GetActiveMisconceptionsInput {
  concept?: string;
  limit?: number;
  subject?: string;
  topic?: string;
  userId: string;
  workspaceId?: string | null;
}

export interface GetMisconceptionByIdInput {
  id: string;
  userId: string;
  workspaceId?: string | null;
}

export interface ResolveMisconceptionsForConceptInput {
  concept: string;
  resolvedAt?: Date;
  subject?: string;
  topic?: string;
  userId: string;
  workspaceId?: string | null;
}

export interface ResolveMisconceptionByIdInput {
  id: string;
  resolvedAt?: Date;
  userId: string;
  workspaceId?: string | null;
}

export interface ImproveMisconceptionForConceptInput {
  concept: string;
  decay?: number;
  observedAt?: Date;
  resolveThreshold?: number;
  subject?: string;
  topic?: string;
  userId: string;
  workspaceId?: string | null;
}

export interface CountRecentConsecutiveRatingsInput {
  concept: string;
  limit?: number;
  rating: FlashcardRating;
  since?: Date;
  subject?: string;
  topic?: string;
  userId: string;
  workspaceId?: string | null;
}

export interface ListRecentCardRatingsInput {
  cardId: string;
  limit?: number;
  userId: string;
}

export interface ListRecentConceptRatingsInput {
  concept: string;
  limit?: number;
  subject?: string;
  topic?: string;
  userId: string;
  workspaceId?: string | null;
}

export interface UpdateMasteryInput {
  activeMisconceptionCount?: number;
  concept: string;
  lastMisconceptionAt?: Date | null;
  lastReviewedAt?: Date | null;
  negativeReviewCount?: number;
  positiveReviewCount?: number;
  reviewCount?: number;
  score?: number;
  subject: string;
  topic: string;
  userId: string;
  workspaceId: string;
}

export interface GetMasteryBySubjectInput {
  limit?: number;
  subject: string;
  userId: string;
  workspaceId?: string | null;
}

export interface GetWeakestConceptsInput {
  limit?: number;
  subject?: string;
  userId: string;
  workspaceId?: string | null;
}

export interface ListMasterySubjectsForUserInput {
  limit?: number;
  userId: string;
  workspaceId?: string | null;
}

export interface RecomputeConceptMasteryInput {
  concept: string;
  reviewedAt?: Date;
  subject: string;
  topic: string;
  userId: string;
  workspaceId: string;
}

const DEFAULT_ACTIVE_MISCONCEPTION_LIMIT = 50;
const DEFAULT_MASTERY_LIMIT = 200;
const DEFAULT_RECENT_RATING_LIMIT = 100;
const MISCONCEPTION_PROMOTION_EVIDENCE_THRESHOLD = 3;
const MISCONCEPTION_PROMOTION_LOOKBACK_MS = 45 * 24 * 60 * 60 * 1000;

const normalizeText = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
};

const normalizeRequiredText = (
  value: unknown,
  fieldName: string,
  maxLength = fieldName === "concept" ? 180 : 120
) => {
  const normalized = normalizeText(value, maxLength);
  if (!normalized) {
    throw new Error(`Missing required field: ${fieldName}.`);
  }

  return normalized;
};

const normalizeScore = (value: number | undefined | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(1, Math.max(0, value));
};

const normalizeCount = (value: number | undefined | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.trunc(value));
};

function normalizeCanonicalSubject(
  value: unknown,
  fieldName = "subject"
): string | null {
  const normalized = normalizeText(value, 120);
  if (!normalized) {
    return null;
  }

  const canonical = canonicalizeSubjectLabel(normalized);
  if (!canonical) {
    throw new Error(`Missing required field: ${fieldName}.`);
  }

  return canonical;
}

function normalizeCanonicalTaxonomy(input: {
  concept?: unknown;
  subject?: unknown;
  topic?: unknown;
}) {
  const subject = normalizeText(input.subject, 120);
  const topic = normalizeText(input.topic, 120);
  const concept = normalizeText(input.concept, 180);
  const taxonomy = canonicalizeLearningTaxonomy({
    concept,
    subject,
    text: [subject, topic, concept].filter(Boolean).join(" "),
    topic,
  });

  return {
    concept: taxonomy?.concept ?? concept,
    subject: taxonomy?.subject ?? canonicalizeSubjectLabel(subject ?? null),
    topic: taxonomy?.topic ?? topic,
  };
}

const MISCONCEPTION_STATUSES = new Set<MisconceptionStatus>([
  "candidate",
  "confirmed",
  "decayed",
  "resolved",
]);

const MISCONCEPTION_EVIDENCE_CLASSES = new Set<MisconceptionEvidenceClass>([
  "manual",
  "review",
  "session",
  "tool",
]);

const normalizeMisconceptionStatus = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return MISCONCEPTION_STATUSES.has(normalized as MisconceptionStatus)
    ? (normalized as MisconceptionStatus)
    : null;
};

const normalizeMisconceptionEvidenceClass = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return MISCONCEPTION_EVIDENCE_CLASSES.has(
    normalized as MisconceptionEvidenceClass
  )
    ? (normalized as MisconceptionEvidenceClass)
    : null;
};

const resolveMisconceptionStatusFromSource = (source: string | undefined) => {
  const normalized = source?.trim().toLowerCase() ?? "";
  if (
    normalized === "manual" ||
    normalized === "chat_tool" ||
    normalized === "tool"
  ) {
    return "confirmed" as const;
  }

  return "candidate" as const;
};

const resolveMisconceptionEvidenceClass = (source: string | undefined) => {
  const normalized = source?.trim().toLowerCase() ?? "";
  if (normalized === "manual" || normalized === "chat_tool") {
    return "manual" as const;
  }

  if (normalized === "review" || normalized === "fsrs_signal") {
    return "review" as const;
  }

  if (normalized === "tool") {
    return "tool" as const;
  }

  return "session" as const;
};

const getMisconceptionEvidenceRoot = (input: {
  evidenceRootId?: string | null;
  sourceSessionId?: string | null;
}) => input.evidenceRootId ?? input.sourceSessionId ?? null;

function buildMisconceptionEvidenceKey(input: {
  evidenceClass: string;
  evidenceRootId?: string | null;
  source: string;
  sourceSessionId?: string | null;
}) {
  const root = getMisconceptionEvidenceRoot(input);
  if (root) {
    return `${input.evidenceClass}:${root}`;
  }

  if (input.sourceSessionId) {
    return `${input.evidenceClass}:session:${input.sourceSessionId}`;
  }

  return `${input.evidenceClass}:source:${input.source}`;
}

const normalizeNullableJson = (
  value: unknown
): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const mapMisconceptionRow = (
  row: typeof misconception.$inferSelect
): MisconceptionRecord => ({
  active: row.status === "confirmed",
  decayedAt: row.decayedAt?.toISOString() ?? null,
  confidence: row.confidence,
  concept: row.concept,
  createdAt: row.createdAt.toISOString(),
  evidenceCount: row.evidenceCount,
  evidenceClass: row.evidenceClass,
  evidenceRootId: row.evidenceRootId,
  evidenceSpan: normalizeNullableJson(row.evidenceSpan),
  firstSeenAt: row.firstSeenAt.toISOString(),
  id: row.id,
  lastSeenAt: row.lastSeenAt.toISOString(),
  promotedAt: row.promotedAt?.toISOString() ?? null,
  reason: row.reason,
  resolvedAt: row.resolvedAt?.toISOString() ?? null,
  source: row.source,
  sourceSessionId: row.sourceSessionId,
  subject: row.subject,
  status: row.status as MisconceptionStatus,
  topic: row.topic,
  updatedAt: row.updatedAt.toISOString(),
  userId: row.userId,
  workspaceId: row.workspaceId,
});

const mapMasteryRow = (
  row: typeof conceptMastery.$inferSelect
): ConceptMasteryRecord => ({
  activeMisconceptionCount: row.activeMisconceptionCount,
  concept: row.concept,
  createdAt: row.createdAt.toISOString(),
  id: row.id,
  lastMisconceptionAt: row.lastMisconceptionAt?.toISOString() ?? null,
  lastReviewedAt: row.lastReviewedAt?.toISOString() ?? null,
  negativeReviewCount: row.negativeReviewCount,
  positiveReviewCount: row.positiveReviewCount,
  reviewCount: row.reviewCount,
  score: row.score,
  subject: row.subject,
  topic: row.topic,
  updatedAt: row.updatedAt.toISOString(),
  userId: row.userId,
  workspaceId: row.workspaceId,
});

const mapMasterySubjectRow = (row: {
  activeMisconceptionCount: number | null;
  averageScore: number | null;
  conceptCount: number | null;
  lastReviewedAt: Date | string | null;
  reviewCount: number | null;
  subject: string;
}): ConceptMasterySubjectRecord => ({
  activeMisconceptionCount: Number(row.activeMisconceptionCount ?? 0),
  averageScore: Number(row.averageScore ?? 0),
  conceptCount: Number(row.conceptCount ?? 0),
  lastReviewedAt:
    row.lastReviewedAt instanceof Date
      ? row.lastReviewedAt.toISOString()
      : typeof row.lastReviewedAt === "string"
        ? row.lastReviewedAt
        : null,
  reviewCount: Number(row.reviewCount ?? 0),
  subject: row.subject,
});

const taxonomyFieldExpression = (field: "subject" | "topic" | "concept") => {
  switch (field) {
    case "subject":
      return sql<string>`coalesce(${flashcardCard.source} ->> 'subject', ${flashcardCard.source} -> 'taxonomy' ->> 'subject')`;
    case "topic":
      return sql<string>`coalesce(${flashcardCard.source} ->> 'topic', ${flashcardCard.source} -> 'taxonomy' ->> 'topic')`;
    case "concept":
      return sql<string>`coalesce(${flashcardCard.source} ->> 'concept', ${flashcardCard.source} -> 'taxonomy' ->> 'concept')`;
  }
};

const buildTaxonomyPredicates = (input: {
  concept: string;
  subject?: string;
  topic?: string;
}) => {
  const predicates = [eq(taxonomyFieldExpression("concept"), input.concept)];

  if (input.subject) {
    predicates.push(eq(taxonomyFieldExpression("subject"), input.subject));
  }

  if (input.topic) {
    predicates.push(eq(taxonomyFieldExpression("topic"), input.topic));
  }

  return predicates;
};

export async function upsertMisconception(
  input: UpsertMisconceptionInput
): Promise<MisconceptionRecord> {
  const now = input.observedAt ?? new Date();
  const taxonomy = normalizeCanonicalTaxonomy({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
  });
  const subject = taxonomy.subject;
  const topic = taxonomy.topic;
  const concept = taxonomy.concept;
  if (!(subject && topic && concept)) {
    throw new Error("Missing required taxonomy fields.");
  }
  const reason = normalizeRequiredText(input.reason, "reason", 600);
  const confidence = normalizeScore(input.confidence);
  const source = input.source ?? "review";
  const evidenceClass =
    normalizeMisconceptionEvidenceClass(input.evidenceClass) ??
    resolveMisconceptionEvidenceClass(source);
  const requestedStatus = normalizeMisconceptionStatus(input.status);
  const sourceStatus = resolveMisconceptionStatusFromSource(source);

  const evidenceRootId = input.evidenceRootId ?? null;
  const sourceSessionId = input.sourceSessionId ?? null;
  const evidenceKey = buildMisconceptionEvidenceKey({
    evidenceClass,
    evidenceRootId,
    source,
    sourceSessionId,
  });
  const evidenceCutoff = new Date(
    now.getTime() - MISCONCEPTION_PROMOTION_LOOKBACK_MS
  );

  const { created, insertedEvidence, previousStatus, row } =
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(misconception)
        .where(
          and(
            eq(misconception.workspaceId, input.workspaceId),
            eq(misconception.userId, input.userId),
            eq(misconception.subject, subject),
            eq(misconception.topic, topic),
            eq(misconception.concept, concept)
          )
        )
        .limit(1);

      const baseStatus: MisconceptionStatus =
        requestedStatus ??
        (existing?.status === "confirmed" || sourceStatus === "confirmed"
          ? "confirmed"
          : "candidate");

      const persisted =
        existing ??
        (
          await tx
            .insert(misconception)
            .values({
              active: baseStatus === "confirmed",
              confidence: confidence ?? 0,
              concept,
              decayedAt: null,
              evidenceClass,
              evidenceCount: 0,
              evidenceRootId,
              evidenceSpan: input.evidenceSpan ?? null,
              firstSeenAt: now,
              lastSeenAt: now,
              promotedAt: baseStatus === "confirmed" ? now : null,
              reason,
              resolvedAt: null,
              source,
              sourceSessionId,
              status: baseStatus,
              subject,
              topic,
              updatedAt: now,
              userId: input.userId,
              workspaceId: input.workspaceId,
            })
            .returning()
        )[0];

      if (!persisted) {
        throw new Error("Failed to upsert misconception.");
      }

      const insertedEvidence =
        (
          await tx
            .insert(misconceptionEvidence)
            .values({
              confidence: confidence ?? 0,
              evidenceClass,
              evidenceKey,
              evidenceRootId,
              evidenceSpan: input.evidenceSpan ?? null,
              misconceptionId: persisted.id,
              observedAt: now,
              sourceSessionId,
              userId: input.userId,
              workspaceId: input.workspaceId,
            })
            .onConflictDoNothing()
            .returning({ id: misconceptionEvidence.id })
        ).length > 0;

      const [evidenceStats] = await tx
        .select({
          distinctEvidenceClassCount: sql<number>`count(distinct ${misconceptionEvidence.evidenceClass})`,
          distinctEvidenceRootCount: sql<number>`count(distinct coalesce(${misconceptionEvidence.evidenceRootId}, ${misconceptionEvidence.sourceSessionId}, ${misconceptionEvidence.evidenceKey}))`,
        })
        .from(misconceptionEvidence)
        .where(
          and(
            eq(misconceptionEvidence.misconceptionId, persisted.id),
            gte(misconceptionEvidence.observedAt, evidenceCutoff)
          )
        );

      const distinctEvidenceRootCount = Number(
        evidenceStats?.distinctEvidenceRootCount ?? 0
      );
      const promotesFromIndependentEvidence =
        !requestedStatus &&
        persisted.status !== "confirmed" &&
        sourceStatus === "candidate" &&
        distinctEvidenceRootCount >= MISCONCEPTION_PROMOTION_EVIDENCE_THRESHOLD;
      const nextStatus: MisconceptionStatus =
        requestedStatus ??
        (persisted.status === "confirmed"
          ? "confirmed"
          : sourceStatus === "confirmed"
            ? "confirmed"
            : promotesFromIndependentEvidence
              ? "confirmed"
              : "candidate");
      const nextConfidence =
        confidence === null
          ? persisted.confidence
          : Math.max(persisted.confidence, confidence);

      const [updated] = await tx
        .update(misconception)
        .set({
          active: nextStatus === "confirmed",
          confidence: nextConfidence,
          concept,
          decayedAt: null,
          evidenceClass,
          evidenceCount: distinctEvidenceRootCount,
          evidenceRootId,
          evidenceSpan: input.evidenceSpan ?? persisted.evidenceSpan ?? null,
          lastSeenAt: now,
          promotedAt:
            nextStatus === "confirmed"
              ? (persisted.promotedAt ?? now)
              : (persisted.promotedAt ?? null),
          reason,
          resolvedAt: null,
          source,
          sourceSessionId,
          status: nextStatus,
          subject,
          topic,
          updatedAt: now,
        })
        .where(eq(misconception.id, persisted.id))
        .returning();

      if (!updated) {
        throw new Error("Failed to upsert misconception.");
      }

      return {
        created: !existing,
        insertedEvidence,
        previousStatus: existing?.status ?? null,
        row: updated,
      };
    });

  if (!row) {
    throw new Error("Failed to upsert misconception.");
  }

  logInfo({
    eventName: created
      ? row.status === "confirmed"
        ? "misconception.candidate.promoted"
        : "misconception.candidate.created"
      : row.status === "confirmed" && previousStatus !== "confirmed"
        ? "misconception.candidate.promoted"
        : row.status === "confirmed" && insertedEvidence
          ? "misconception.confirmed.reinforced"
          : insertedEvidence
            ? "misconception.candidate.reinforced"
            : "misconception.candidate.duplicate_ignored",
    payload: {
      active: row.active,
      confidence: row.confidence,
      concept: row.concept,
      evidenceCount: row.evidenceCount,
      evidenceClass: row.evidenceClass,
      firstSeenAt: row.firstSeenAt.toISOString(),
      promotedAt: row.promotedAt?.toISOString() ?? null,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      source: row.source,
      status: row.status,
      subject: row.subject,
      topic: row.topic,
      updatedAt: row.updatedAt.toISOString(),
      userId: row.userId,
      workspaceId: row.workspaceId,
    },
  });

  return mapMisconceptionRow(row);
}

export async function getActiveMisconceptions(
  input: GetActiveMisconceptionsInput
): Promise<MisconceptionRecord[]> {
  const taxonomy = normalizeCanonicalTaxonomy({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
  });
  const subject = taxonomy.subject ?? null;
  const topic = taxonomy.topic ?? null;
  const concept = taxonomy.concept ?? null;

  const rows = await db
    .select()
    .from(misconception)
    .where(
      and(
        eq(misconception.userId, input.userId),
        input.workspaceId
          ? eq(misconception.workspaceId, input.workspaceId)
          : undefined,
        eq(misconception.status, "confirmed"),
        subject ? eq(misconception.subject, subject) : undefined,
        topic ? eq(misconception.topic, topic) : undefined,
        concept ? eq(misconception.concept, concept) : undefined
      )
    )
    .orderBy(desc(misconception.lastSeenAt), desc(misconception.createdAt))
    .limit(Math.max(1, input.limit ?? DEFAULT_ACTIVE_MISCONCEPTION_LIMIT));

  return rows.map(mapMisconceptionRow);
}

export async function getMisconceptionById(
  input: GetMisconceptionByIdInput
): Promise<MisconceptionRecord | null> {
  const [row] = await db
    .select()
    .from(misconception)
    .where(
      and(
        eq(misconception.id, input.id),
        eq(misconception.userId, input.userId),
        input.workspaceId
          ? eq(misconception.workspaceId, input.workspaceId)
          : undefined
      )
    )
    .limit(1);

  return row ? mapMisconceptionRow(row) : null;
}

export async function resolveMisconceptionsForConcept(
  input: ResolveMisconceptionsForConceptInput
): Promise<MisconceptionRecord[]> {
  const resolvedAt = input.resolvedAt ?? new Date();
  const taxonomy = normalizeCanonicalTaxonomy({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
  });
  const subject = taxonomy.subject ?? null;
  const topic = taxonomy.topic ?? null;
  const concept = taxonomy.concept;
  if (!concept) {
    throw new Error("Missing required field: concept.");
  }

  const rows = await db
    .update(misconception)
    .set({
      active: false,
      status: "resolved",
      resolvedAt,
      updatedAt: resolvedAt,
    })
    .where(
      and(
        eq(misconception.userId, input.userId),
        input.workspaceId
          ? eq(misconception.workspaceId, input.workspaceId)
          : undefined,
        inArray(misconception.status, ["candidate", "confirmed"]),
        subject ? eq(misconception.subject, subject) : undefined,
        topic ? eq(misconception.topic, topic) : undefined,
        eq(misconception.concept, concept)
      )
    )
    .returning();

  if (rows.length > 0) {
    logInfo({
      eventName: "misconception.state.resolved",
      payload: {
        concept,
        count: rows.length,
        subject: subject ?? null,
        topic: topic ?? null,
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
      },
    });
  }

  return rows.map(mapMisconceptionRow);
}

export async function resolveMisconceptionById(
  input: ResolveMisconceptionByIdInput
): Promise<MisconceptionRecord | null> {
  const resolvedAt = input.resolvedAt ?? new Date();
  const [row] = await db
    .update(misconception)
    .set({
      active: false,
      status: "resolved",
      resolvedAt,
      updatedAt: resolvedAt,
    })
    .where(
      and(
        eq(misconception.id, input.id),
        eq(misconception.userId, input.userId),
        input.workspaceId
          ? eq(misconception.workspaceId, input.workspaceId)
          : undefined
      )
    )
    .returning();

  if (row) {
    logInfo({
      eventName: "misconception.state.resolved",
      payload: {
        concept: row.concept,
        count: 1,
        subject: row.subject,
        topic: row.topic,
        userId: row.userId,
        workspaceId: row.workspaceId,
      },
    });
  }

  return row ? mapMisconceptionRow(row) : null;
}

export async function improveMisconceptionsForConcept(
  input: ImproveMisconceptionForConceptInput
): Promise<MisconceptionRecord[]> {
  const taxonomy = normalizeCanonicalTaxonomy({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
  });
  const concept = taxonomy.concept;
  const subject = taxonomy.subject ?? null;
  const topic = taxonomy.topic ?? null;
  if (!concept) {
    throw new Error("Missing required field: concept.");
  }
  const decayRaw = typeof input.decay === "number" ? input.decay : 0.08;
  const decay = Math.min(0.5, Math.max(0.02, decayRaw));
  const resolveThresholdRaw =
    typeof input.resolveThreshold === "number" ? input.resolveThreshold : 0.2;
  const resolveThreshold = Math.min(0.9, Math.max(0, resolveThresholdRaw));
  const observedAt = input.observedAt ?? new Date();

  const nextConfidence = sql<number>`greatest(0, ${misconception.confidence} - ${decay})`;

  const rows = await db
    .update(misconception)
    .set({
      confidence: nextConfidence,
      active: sql<boolean>`case when ${nextConfidence} <= ${resolveThreshold} then false else ${misconception.status} = 'confirmed' end`,
      decayedAt: sql<Date | null>`case when ${nextConfidence} <= ${resolveThreshold} then ${observedAt} else ${misconception.decayedAt} end`,
      status: sql<string>`case when ${nextConfidence} <= ${resolveThreshold} then 'decayed' else ${misconception.status} end`,
      updatedAt: observedAt,
    })
    .where(
      and(
        eq(misconception.userId, input.userId),
        input.workspaceId
          ? eq(misconception.workspaceId, input.workspaceId)
          : undefined,
        inArray(misconception.status, ["candidate", "confirmed"]),
        eq(misconception.concept, concept),
        subject ? eq(misconception.subject, subject) : undefined,
        topic ? eq(misconception.topic, topic) : undefined
      )
    )
    .returning();

  if (rows.length > 0) {
    logInfo({
      eventName: "misconception.state.decayed",
      payload: {
        confidenceFloor: resolveThreshold,
        count: rows.length,
        concept,
        decay,
        resolvedCount: rows.filter((row) => row.status === "decayed").length,
        subject: subject ?? null,
        topic: topic ?? null,
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
      },
    });
  }

  return rows.map(mapMisconceptionRow);
}

export async function countRecentConsecutiveRatings(
  input: CountRecentConsecutiveRatingsInput
): Promise<number> {
  const taxonomy = normalizeCanonicalTaxonomy({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
  });
  const subject = taxonomy.subject ?? null;
  const topic = taxonomy.topic ?? null;
  const concept = taxonomy.concept;
  if (!concept) {
    throw new Error("Missing required field: concept.");
  }
  const rows = await db
    .select({
      rating: flashcardReviewLog.rating,
      reviewedAt: flashcardReviewLog.reviewedAt,
    })
    .from(flashcardReviewLog)
    .innerJoin(
      flashcardCard,
      eq(flashcardCard.id, flashcardReviewLog.flashcardId)
    )
    .innerJoin(flashcardSet, eq(flashcardSet.id, flashcardCard.setId))
    .where(
      and(
        eq(flashcardReviewLog.userId, input.userId),
        input.workspaceId
          ? eq(flashcardSet.workspaceId, input.workspaceId)
          : undefined,
        gte(flashcardReviewLog.reviewedAt, input.since ?? new Date(0)),
        ...buildTaxonomyPredicates({
          concept,
          subject: subject ?? undefined,
          topic: topic ?? undefined,
        })
      )
    )
    .orderBy(desc(flashcardReviewLog.reviewedAt), desc(flashcardReviewLog.id))
    .limit(Math.max(1, input.limit ?? DEFAULT_RECENT_RATING_LIMIT));

  let count = 0;
  for (const row of rows) {
    if (row.rating !== input.rating) {
      break;
    }
    count += 1;
  }

  return count;
}

export async function listRecentCardRatings(
  input: ListRecentCardRatingsInput
): Promise<FlashcardRating[]> {
  const rows = await db
    .select({
      rating: flashcardReviewLog.rating,
    })
    .from(flashcardReviewLog)
    .where(
      and(
        eq(flashcardReviewLog.userId, input.userId),
        eq(flashcardReviewLog.flashcardId, input.cardId)
      )
    )
    .orderBy(desc(flashcardReviewLog.reviewedAt), desc(flashcardReviewLog.id))
    .limit(Math.max(1, input.limit ?? DEFAULT_RECENT_RATING_LIMIT));

  return rows.map((row) => row.rating as FlashcardRating);
}

export async function listRecentConceptRatings(
  input: ListRecentConceptRatingsInput
): Promise<FlashcardRating[]> {
  const taxonomy = normalizeCanonicalTaxonomy({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
  });
  const subject = taxonomy.subject ?? null;
  const topic = taxonomy.topic ?? null;
  const concept = taxonomy.concept;
  if (!concept) {
    throw new Error("Missing required field: concept.");
  }

  const rows = await db
    .select({
      rating: flashcardReviewLog.rating,
    })
    .from(flashcardReviewLog)
    .innerJoin(
      flashcardCard,
      eq(flashcardCard.id, flashcardReviewLog.flashcardId)
    )
    .innerJoin(flashcardSet, eq(flashcardSet.id, flashcardCard.setId))
    .where(
      and(
        eq(flashcardReviewLog.userId, input.userId),
        input.workspaceId
          ? eq(flashcardSet.workspaceId, input.workspaceId)
          : undefined,
        ...buildTaxonomyPredicates({
          concept,
          subject: subject ?? undefined,
          topic: topic ?? undefined,
        })
      )
    )
    .orderBy(desc(flashcardReviewLog.reviewedAt), desc(flashcardReviewLog.id))
    .limit(Math.max(1, input.limit ?? DEFAULT_RECENT_RATING_LIMIT));

  return rows.map((row) => row.rating as FlashcardRating);
}

function normalizeMasteryScore(params: {
  activeMisconceptionCount: number;
  activeMisconceptionScore: number;
  averageStability: number;
  negativeReviewCount: number;
  positiveReviewCount: number;
  reviewCount: number;
}) {
  if (params.reviewCount <= 0) {
    return 0;
  }

  const stabilityComponent = Math.max(
    0,
    Math.min(1, params.averageStability > 0 ? params.averageStability / 20 : 0)
  );
  const performanceComponent =
    params.reviewCount > 0
      ? params.positiveReviewCount / params.reviewCount
      : 0;
  const negativePenalty =
    params.reviewCount > 0
      ? Math.min(0.3, params.negativeReviewCount / params.reviewCount / 2)
      : 0;
  const misconceptionPenalty = Math.min(
    0.5,
    Math.max(
      params.activeMisconceptionCount * 0.06,
      params.activeMisconceptionScore * 0.12
    )
  );

  return Number(
    Math.max(
      0,
      Math.min(
        1,
        stabilityComponent * 0.55 +
          performanceComponent * 0.35 -
          negativePenalty -
          misconceptionPenalty
      )
    ).toFixed(4)
  );
}

export async function recomputeConceptMastery(
  input: RecomputeConceptMasteryInput
): Promise<ConceptMasteryRecord> {
  const taxonomy = normalizeCanonicalTaxonomy({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
  });
  const concept = taxonomy.concept;
  const subject = taxonomy.subject;
  const topic = taxonomy.topic;
  if (!(subject && topic && concept)) {
    throw new Error("Missing required taxonomy fields.");
  }

  const reviewStats = await db
    .select({
      lastReviewedAt: sql<Date | null>`max(${flashcardReviewLog.reviewedAt})`,
      negativeReviewCount: sql<number>`count(*) filter (where ${flashcardReviewLog.rating} = 'again')`,
      positiveReviewCount: sql<number>`count(*) filter (where ${flashcardReviewLog.rating} in ('good', 'easy'))`,
      reviewCount: sql<number>`count(*)`,
    })
    .from(flashcardReviewLog)
    .innerJoin(
      flashcardCard,
      eq(flashcardCard.id, flashcardReviewLog.flashcardId)
    )
    .innerJoin(flashcardSet, eq(flashcardSet.id, flashcardCard.setId))
    .where(
      and(
        eq(flashcardReviewLog.userId, input.userId),
        eq(flashcardSet.workspaceId, input.workspaceId),
        ...buildTaxonomyPredicates({ concept, subject, topic })
      )
    );

  const stabilityRows = await db
    .select({
      averageStability: sql<
        number | null
      >`avg(${flashcardReviewState.stability})`,
    })
    .from(flashcardReviewState)
    .innerJoin(
      flashcardCard,
      eq(flashcardReviewState.flashcardId, flashcardCard.id)
    )
    .innerJoin(flashcardSet, eq(flashcardSet.id, flashcardCard.setId))
    .where(
      and(
        eq(flashcardReviewState.userId, input.userId),
        eq(flashcardSet.workspaceId, input.workspaceId),
        eq(flashcardReviewState.suspended, false),
        ...buildTaxonomyPredicates({ concept, subject, topic })
      )
    );

  const activeMisconceptions = await getActiveMisconceptions({
    concept,
    subject,
    topic,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  const [reviewRow] = reviewStats;
  const averageStability = Number(stabilityRows[0]?.averageStability ?? 0);
  const reviewCount = Number(reviewRow?.reviewCount ?? 0);
  const positiveReviewCount = Number(reviewRow?.positiveReviewCount ?? 0);
  const negativeReviewCount = Number(reviewRow?.negativeReviewCount ?? 0);
  const activeMisconceptionCount = activeMisconceptions.length;
  const activeMisconceptionScore = activeMisconceptions.reduce(
    (total, misconception) => total + Math.max(0, misconception.confidence),
    0
  );
  const lastMisconceptionAt =
    activeMisconceptions[0]?.updatedAt != null
      ? new Date(activeMisconceptions[0].updatedAt)
      : null;
  const lastReviewedAt =
    input.reviewedAt ??
    (reviewRow?.lastReviewedAt ? new Date(reviewRow.lastReviewedAt) : null) ??
    null;

  return updateMastery({
    activeMisconceptionCount,
    concept,
    lastMisconceptionAt,
    lastReviewedAt,
    negativeReviewCount,
    positiveReviewCount,
    reviewCount,
    score: normalizeMasteryScore({
      activeMisconceptionCount,
      activeMisconceptionScore,
      averageStability,
      negativeReviewCount,
      positiveReviewCount,
      reviewCount,
    }),
    subject,
    topic,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });
}

export async function updateMastery(
  input: UpdateMasteryInput
): Promise<ConceptMasteryRecord> {
  const now = new Date();
  const taxonomy = normalizeCanonicalTaxonomy({
    concept: input.concept,
    subject: input.subject,
    topic: input.topic,
  });
  const subject = taxonomy.subject;
  const topic = taxonomy.topic;
  const concept = taxonomy.concept;
  if (!(subject && topic && concept)) {
    throw new Error("Missing required taxonomy fields.");
  }
  const score = normalizeScore(input.score);
  const reviewCount = normalizeCount(input.reviewCount);
  const positiveReviewCount = normalizeCount(input.positiveReviewCount);
  const negativeReviewCount = normalizeCount(input.negativeReviewCount);
  const activeMisconceptionCount = normalizeCount(
    input.activeMisconceptionCount
  );

  const values = {
    workspaceId: input.workspaceId,
    userId: input.userId,
    subject,
    topic,
    concept,
    score: score ?? 0,
    reviewCount: reviewCount ?? 0,
    positiveReviewCount: positiveReviewCount ?? 0,
    negativeReviewCount: negativeReviewCount ?? 0,
    activeMisconceptionCount: activeMisconceptionCount ?? 0,
    lastReviewedAt: input.lastReviewedAt ?? null,
    lastMisconceptionAt: input.lastMisconceptionAt ?? null,
    updatedAt: now,
  };

  const [row] = await db
    .insert(conceptMastery)
    .values(values)
    .onConflictDoUpdate({
      target: [
        conceptMastery.workspaceId,
        conceptMastery.userId,
        conceptMastery.subject,
        conceptMastery.topic,
        conceptMastery.concept,
      ],
      set: {
        ...(score === null ? {} : { score }),
        ...(reviewCount === null ? {} : { reviewCount }),
        ...(positiveReviewCount === null ? {} : { positiveReviewCount }),
        ...(negativeReviewCount === null ? {} : { negativeReviewCount }),
        ...(activeMisconceptionCount === null
          ? {}
          : { activeMisconceptionCount }),
        ...(input.lastReviewedAt === undefined
          ? {}
          : { lastReviewedAt: input.lastReviewedAt }),
        ...(input.lastMisconceptionAt === undefined
          ? {}
          : { lastMisconceptionAt: input.lastMisconceptionAt }),
        updatedAt: now,
      },
    })
    .returning();

  if (!row) {
    throw new Error("Failed to update concept mastery.");
  }

  return mapMasteryRow(row);
}

export async function getMasteryBySubject(
  input: GetMasteryBySubjectInput
): Promise<ConceptMasteryRecord[]> {
  const subject = normalizeCanonicalSubject(input.subject);
  if (!subject) {
    throw new Error("Missing required field: subject.");
  }

  const rows = await db
    .select()
    .from(conceptMastery)
    .where(
      and(
        eq(conceptMastery.userId, input.userId),
        eq(conceptMastery.subject, subject),
        input.workspaceId
          ? eq(conceptMastery.workspaceId, input.workspaceId)
          : undefined
      )
    )
    .orderBy(
      desc(conceptMastery.score),
      desc(conceptMastery.lastReviewedAt),
      asc(conceptMastery.topic),
      asc(conceptMastery.concept)
    )
    .limit(Math.max(1, input.limit ?? DEFAULT_MASTERY_LIMIT));

  return rows.map(mapMasteryRow);
}

export async function getWeakestConcepts(
  input: GetWeakestConceptsInput
): Promise<ConceptMasteryRecord[]> {
  const subject = input.subject
    ? normalizeCanonicalSubject(input.subject)
    : null;

  const rows = await db
    .select()
    .from(conceptMastery)
    .where(
      and(
        eq(conceptMastery.userId, input.userId),
        subject ? eq(conceptMastery.subject, subject) : undefined,
        input.workspaceId
          ? eq(conceptMastery.workspaceId, input.workspaceId)
          : undefined
      )
    )
    .orderBy(
      asc(conceptMastery.score),
      desc(conceptMastery.activeMisconceptionCount),
      desc(conceptMastery.lastReviewedAt),
      asc(conceptMastery.topic),
      asc(conceptMastery.concept)
    )
    .limit(Math.max(1, input.limit ?? DEFAULT_MASTERY_LIMIT));

  return rows.map(mapMasteryRow);
}

export async function listMasterySubjectsForUser(
  input: ListMasterySubjectsForUserInput
): Promise<ConceptMasterySubjectRecord[]> {
  const limit = Math.max(1, input.limit ?? DEFAULT_MASTERY_LIMIT);

  const rows = await db
    .select({
      activeMisconceptionCount: sql<number>`sum(${conceptMastery.activeMisconceptionCount})`,
      averageScore: sql<number>`avg(${conceptMastery.score})`,
      conceptCount: sql<number>`count(*)`,
      lastReviewedAt: sql<Date | null>`max(${conceptMastery.lastReviewedAt})`,
      reviewCount: sql<number>`sum(${conceptMastery.reviewCount})`,
      subject: conceptMastery.subject,
    })
    .from(conceptMastery)
    .where(
      and(
        eq(conceptMastery.userId, input.userId),
        input.workspaceId
          ? eq(conceptMastery.workspaceId, input.workspaceId)
          : undefined
      )
    )
    .groupBy(conceptMastery.subject)
    .orderBy(
      asc(sql<number>`avg(${conceptMastery.score})`),
      desc(sql<number>`count(*)`),
      asc(conceptMastery.subject)
    )
    .limit(limit);

  return rows.map(mapMasterySubjectRow);
}
