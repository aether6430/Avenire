import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "./client";
import { sessionSummary } from "./schema";

export interface SessionSummaryRecord {
  chatId: string;
  conceptsCovered: string[];
  createdAt: string;
  endPosition: number;
  endedAt: string;
  flashcardsCreated: number;
  id: string;
  misconceptionsDetected: string[];
  startedAt: string;
  startPosition: number;
  subject: string | null;
  subjectConfidence: number | null;
  summaryText: string;
  updatedAt: string;
  userId: string;
  workspaceId: string;
}

export interface CreateSessionSummaryInput {
  chatId: string;
  conceptsCovered: string[];
  endedAt: Date;
  flashcardsCreated: number;
  id?: string;
  misconceptionsDetected: string[];
  startedAt: Date;
  startPosition: number;
  endPosition: number;
  subject?: string | null;
  subjectConfidence?: number | null;
  summaryText: string;
  userId: string;
  workspaceId: string;
}

export interface ListSessionSummariesForUserInput {
  chatId?: string;
  limit?: number;
  userId: string;
  workspaceId?: string | null;
}

export interface GetRecentRelevantSessionSummaryInput {
  chatId?: string;
  subject?: string | null;
  userId: string;
  workspaceId?: string | null;
}

const DEFAULT_SESSION_SUMMARY_LIMIT = 20;
const SESSION_SUMMARY_RELATION = "session_summaries";

function isMissingSessionSummarySchemaError(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes(SESSION_SUMMARY_RELATION) &&
    (message.includes("does not exist") ||
      message.includes("no such table") ||
      message.includes("unknown relation") ||
      message.includes("unknown table") ||
      message.includes("column") ||
      message.includes("relation"))
  );
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : null;
}

function normalizeStringList(values: string[] | undefined, maxItems: number) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => normalizeText(value, 180))
        .filter((value): value is string => Boolean(value))
    )
  ).slice(0, maxItems);
}

function normalizeRequiredText(value: unknown, fieldName: string, maxLength: number) {
  const normalized = normalizeText(value, maxLength);
  if (!normalized) {
    throw new Error(`Missing required field: ${fieldName}.`);
  }

  return normalized;
}

function normalizePosition(value: number, fieldName: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return Math.trunc(value);
}

function normalizeCount(value: number, fieldName: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return Math.trunc(value);
}

function normalizeScore(value: number | null | undefined, fieldName: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return value;
}

function normalizedSubjectExpression(column: typeof sessionSummary.subject) {
  return sql<string>`regexp_replace(lower(coalesce(${column}, '')), '[_\\s]+', ' ', 'g')`;
}

const mapSessionSummaryRow = (
  row: typeof sessionSummary.$inferSelect
): SessionSummaryRecord => ({
  chatId: row.chatId,
  conceptsCovered: Array.isArray(row.conceptsCovered) ? row.conceptsCovered : [],
  createdAt: row.createdAt.toISOString(),
  endPosition: row.endPosition,
  endedAt: row.endedAt.toISOString(),
  flashcardsCreated: row.flashcardsCreated,
  id: row.id,
  misconceptionsDetected: Array.isArray(row.misconceptionsDetected)
    ? row.misconceptionsDetected
    : [],
  startedAt: row.startedAt.toISOString(),
  startPosition: row.startPosition,
  subject: row.subject ?? null,
  subjectConfidence: row.subjectConfidence ?? null,
  summaryText: row.summaryText,
  updatedAt: row.updatedAt.toISOString(),
  userId: row.userId,
  workspaceId: row.workspaceId,
});

export async function createSessionSummary(
  input: CreateSessionSummaryInput
): Promise<SessionSummaryRecord | null> {
  const now = new Date();
  const values = {
    id: input.id,
    workspaceId: input.workspaceId,
    userId: input.userId,
    chatId: normalizeRequiredText(input.chatId, "chatId", 120),
    subject: normalizeText(input.subject, 120),
    subjectConfidence: normalizeScore(
      input.subjectConfidence,
      "subjectConfidence"
    ),
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    startPosition: normalizePosition(input.startPosition, "startPosition"),
    endPosition: normalizePosition(input.endPosition, "endPosition"),
    conceptsCovered: normalizeStringList(input.conceptsCovered, 12),
    misconceptionsDetected: normalizeStringList(
      input.misconceptionsDetected,
      12
    ),
    flashcardsCreated: normalizeCount(
      input.flashcardsCreated,
      "flashcardsCreated"
    ),
    summaryText: normalizeRequiredText(input.summaryText, "summaryText", 4000),
    updatedAt: now,
  };

  try {
    const [row] = await db
      .insert(sessionSummary)
      .values(values)
      .onConflictDoUpdate({
        target: sessionSummary.id,
        set: {
          subject: values.subject,
          subjectConfidence: values.subjectConfidence,
          startedAt: values.startedAt,
          endedAt: values.endedAt,
          startPosition: values.startPosition,
          endPosition: values.endPosition,
          conceptsCovered: values.conceptsCovered,
          misconceptionsDetected: values.misconceptionsDetected,
          flashcardsCreated: values.flashcardsCreated,
          summaryText: values.summaryText,
          updatedAt: now,
        },
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create session summary.");
    }

    return mapSessionSummaryRow(row);
  } catch (error) {
    if (isMissingSessionSummarySchemaError(error)) {
      console.warn(
        "[database] session_summaries schema is missing; skipping session summary write"
      );
      return null;
    }

    throw error;
  }
}

export async function listSessionSummariesForUser(
  input: ListSessionSummariesForUserInput
): Promise<SessionSummaryRecord[]> {
  try {
    const rows = await db
      .select()
      .from(sessionSummary)
      .where(
        and(
          eq(sessionSummary.userId, input.userId),
          input.workspaceId
            ? eq(sessionSummary.workspaceId, input.workspaceId)
            : undefined,
          input.chatId ? eq(sessionSummary.chatId, input.chatId) : undefined
        )
      )
      .orderBy(desc(sessionSummary.endedAt), desc(sessionSummary.createdAt))
      .limit(Math.max(1, input.limit ?? DEFAULT_SESSION_SUMMARY_LIMIT));

    return rows.map(mapSessionSummaryRow);
  } catch (error) {
    if (isMissingSessionSummarySchemaError(error)) {
      return [];
    }

    throw error;
  }
}

export async function getLatestSessionSummaryForChat(
  chatId: string
): Promise<SessionSummaryRecord | null> {
  try {
    const [row] = await db
      .select()
      .from(sessionSummary)
      .where(
        eq(sessionSummary.chatId, normalizeRequiredText(chatId, "chatId", 120))
      )
      .orderBy(desc(sessionSummary.endedAt), desc(sessionSummary.createdAt))
      .limit(1);

    return row ? mapSessionSummaryRow(row) : null;
  } catch (error) {
    if (isMissingSessionSummarySchemaError(error)) {
      return null;
    }

    throw error;
  }
}

export async function getLatestSessionSummaryForWorkspace(input: {
  userId: string;
  workspaceId: string;
}): Promise<SessionSummaryRecord | null> {
  try {
    const [row] = await db
      .select()
      .from(sessionSummary)
      .where(
        and(
          eq(sessionSummary.userId, input.userId),
          eq(sessionSummary.workspaceId, input.workspaceId)
        )
      )
      .orderBy(desc(sessionSummary.endedAt), desc(sessionSummary.createdAt))
      .limit(1);

    return row ? mapSessionSummaryRow(row) : null;
  } catch (error) {
    if (isMissingSessionSummarySchemaError(error)) {
      return null;
    }

    throw error;
  }
}

export async function getRecentRelevantSessionSummary(
  input: GetRecentRelevantSessionSummaryInput
): Promise<SessionSummaryRecord | null> {
  const normalizedSubject = normalizeText(input.subject, 120);

  try {
    const [row] = await db
      .select()
      .from(sessionSummary)
      .where(
        and(
          eq(sessionSummary.userId, input.userId),
          input.workspaceId
            ? eq(sessionSummary.workspaceId, input.workspaceId)
            : undefined,
          input.chatId ? eq(sessionSummary.chatId, input.chatId) : undefined,
          normalizedSubject
            ? or(
                eq(
                  normalizedSubjectExpression(sessionSummary.subject),
                  normalizedSubject.toLowerCase().replace(/[_\s]+/g, " ")
                ),
                ilike(sessionSummary.summaryText, `%${normalizedSubject}%`)
              )
            : undefined
        )
      )
      .orderBy(desc(sessionSummary.endedAt), desc(sessionSummary.createdAt))
      .limit(1);

    return row ? mapSessionSummaryRow(row) : null;
  } catch (error) {
    if (isMissingSessionSummarySchemaError(error)) {
      return null;
    }

    throw error;
  }
}
