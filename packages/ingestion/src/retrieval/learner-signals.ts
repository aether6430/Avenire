import { db } from "@avenire/database";
import { sql } from "drizzle-orm";
import type { VectorSearchResult } from "./vector-store";

type LearnerSignal = {
  boost: number;
  matchedConcepts: string[];
  misconceptionBoost: number;
  stabilityBoost: number;
};

const normalizeLabel = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") {
          return normalizeLabel(entry);
        }

        if (entry && typeof entry === "object") {
          return (
            normalizeLabel((entry as { concept?: unknown }).concept) ??
            normalizeLabel((entry as { label?: unknown }).label) ??
            normalizeLabel((entry as { topic?: unknown }).topic)
          );
        }

        return null;
      })
      .filter((entry): entry is string => Boolean(entry));
  }

  const normalized = normalizeLabel(value);
  return normalized ? [normalized] : [];
};

const extractConceptLabels = (metadata: Record<string, unknown>): string[] => {
  const labels = new Set<string>();

  for (const value of [
    ...toStringArray(metadata.concepts),
    ...toStringArray(metadata.conceptIds),
    ...toStringArray(metadata.concept),
    ...toStringArray(metadata.topic),
    ...toStringArray(metadata.subject),
  ]) {
    labels.add(value);
  }

  return Array.from(labels);
};

const stabilityToBoost = (stability: number | null): number => {
  if (stability === null || !Number.isFinite(stability)) {
    return 1;
  }

  if (stability < 1) {
    return 1.4;
  }

  if (stability <= 7) {
    return 1.2;
  }

  if (stability > 30) {
    return 0.9;
  }

  return 1;
};

export async function getLearnerSignalBoosts(input: {
  candidates: VectorSearchResult[];
  userId: string;
  workspaceId: string;
}): Promise<Map<string, LearnerSignal>> {
  const concepts = Array.from(
    new Set(
      input.candidates.flatMap((candidate) =>
        extractConceptLabels(candidate.metadata)
      )
    )
  );

  if (concepts.length === 0) {
    return new Map();
  }

  const conceptValues = sql.join(
    concepts.map((concept) => sql`${concept}`),
    sql`, `
  );

  const [stabilityRows, misconceptionRows] = await Promise.all([
    db.execute(sql<{ concept: string; stability: number | null }>`
      SELECT
        lower(trim(coalesce(card.source->>'concept', ''))) AS "concept",
        min(state.stability) AS "stability"
      FROM flashcard_review_state state
      INNER JOIN flashcard_card card ON card.id = state.flashcard_id
      INNER JOIN flashcard_set sets ON sets.id = card.set_id
      WHERE state.user_id = ${input.userId}
        AND sets.workspace_id = ${input.workspaceId}::uuid
        AND lower(trim(coalesce(card.source->>'concept', ''))) IN (${conceptValues})
      GROUP BY 1
    `),
    db.execute(sql<{ concept: string; confidence: number | null }>`
      SELECT
        lower(trim(concept)) AS "concept",
        max(confidence) AS "confidence"
      FROM misconception
      WHERE user_id = ${input.userId}
        AND workspace_id = ${input.workspaceId}::uuid
        AND active = true
        AND lower(trim(concept)) IN (${conceptValues})
      GROUP BY 1
    `),
  ]);

  const stabilityEntries: Array<[string, number]> = [];
  for (const row of stabilityRows.rows as Array<{
    concept: string;
    stability: number | null;
  }>) {
    const concept = normalizeLabel(row.concept);
    if (!concept) {
      continue;
    }

    stabilityEntries.push([
      concept,
      stabilityToBoost(
        row.stability === null ? null : Number(row.stability) || null
      ),
    ]);
  }

  const misconceptionEntries: Array<[string, number]> = [];
  for (const row of misconceptionRows.rows as Array<{
    concept: string;
    confidence: number | null;
  }>) {
    const concept = normalizeLabel(row.concept);
    if (!concept) {
      continue;
    }

    const confidence =
      row.confidence === null ? 0 : Math.max(0, Number(row.confidence) || 0);
    misconceptionEntries.push([
      concept,
      Math.min(1.12, 1 + confidence * 0.08),
    ]);
  }

  const stabilityBoostByConcept = new Map<string, number>(stabilityEntries);
  const misconceptionBoostByConcept = new Map<string, number>(
    misconceptionEntries
  );

  return new Map(
    input.candidates.map((candidate) => {
      const matchedConcepts = extractConceptLabels(candidate.metadata);
      const stabilityBoost = matchedConcepts.reduce(
        (best, concept) => Math.max(best, stabilityBoostByConcept.get(concept) ?? 1),
        1
      );
      const misconceptionBoost = matchedConcepts.reduce(
        (best, concept) =>
          Math.max(best, misconceptionBoostByConcept.get(concept) ?? 1),
        1
      );
      const boost = Math.min(1.6, stabilityBoost * misconceptionBoost);

      return [
        candidate.chunkId,
        {
          boost,
          matchedConcepts,
          misconceptionBoost,
          stabilityBoost,
        },
      ];
    })
  );
}
