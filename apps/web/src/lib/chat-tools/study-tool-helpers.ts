import {
  canonicalizeLearningTaxonomy,
  type MisconceptionRecord,
} from "@avenire/database";

export const MISCONCEPTION_CONTEXT_LIMIT = 5;

export interface FlashcardTaxonomy {
  concept: string;
  subject: string;
  topic: string;
}

function normalizeMisconceptionField(value: string, maxLength: number) {
  return sanitizeTaxonomyLabel(value, maxLength).replace(/\s+/g, " ");
}

export function normalizeMisconceptionSubjectKey(value: string) {
  return normalizeMisconceptionField(
    value.replace(/[_-]+/g, " "),
    80
  ).toLowerCase();
}

export function normalizeStudyMatchKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildTopicKey(
  taxonomy: Pick<FlashcardTaxonomy, "subject" | "topic">
) {
  return [
    normalizeStudyMatchKey(taxonomy.subject),
    normalizeStudyMatchKey(taxonomy.topic),
  ].join("::");
}

export function matchesTaxonomyScope(
  taxonomy: FlashcardTaxonomy,
  scope: Partial<FlashcardTaxonomy>
) {
  if (
    scope.subject &&
    normalizeStudyMatchKey(taxonomy.subject) !==
      normalizeStudyMatchKey(scope.subject)
  ) {
    return false;
  }

  if (
    scope.topic &&
    normalizeStudyMatchKey(taxonomy.topic) !==
      normalizeStudyMatchKey(scope.topic)
  ) {
    return false;
  }

  if (
    scope.concept &&
    normalizeStudyMatchKey(taxonomy.concept) !==
      normalizeStudyMatchKey(scope.concept)
  ) {
    return false;
  }

  return true;
}

export function buildMisconceptionContext(
  misconceptions: MisconceptionRecord[]
) {
  if (misconceptions.length === 0) {
    return null;
  }

  const lines = misconceptions
    .slice(0, MISCONCEPTION_CONTEXT_LIMIT)
    .map(
      (misconception, index) =>
        `${index + 1}. ${misconception.concept} [${misconception.subject} / ${misconception.topic}] - ${misconception.reason} (confidence ${misconception.confidence.toFixed(2)})`
    );

  return [
    "Active learning misconceptions:",
    ...lines,
    "Use this as private tutoring context. Correct these misunderstandings when relevant, but do not mention that this context was injected unless the user asks.",
  ].join("\n");
}

export function buildMisconceptionStudySource(
  misconception: Pick<
    MisconceptionRecord,
    "concept" | "reason" | "subject" | "topic"
  >
) {
  return [
    `Concept: ${misconception.concept}`,
    `Subject: ${misconception.subject}`,
    `Topic: ${misconception.topic}`,
    `Misconception: ${misconception.reason}`,
    "Create cards for a Mindset Set that confront the wrong model directly, then replace it with the correct reasoning.",
  ].join("\n");
}

export function mapMisconceptionForTool(record: MisconceptionRecord) {
  return {
    confidence: record.confidence,
    concept: record.concept,
    createdAt: record.createdAt,
    reason: record.reason,
    resolvedAt: record.resolvedAt,
    source: record.source,
    subject: record.subject,
    topic: record.topic,
    updatedAt: record.updatedAt,
    workspaceId: record.workspaceId,
  };
}

function formatCitationLocation(match: {
  endMs?: number | null;
  page?: number | null;
  startMs?: number | null;
}) {
  if (typeof match.page === "number") {
    return ` p.${match.page}`;
  }

  if (typeof match.startMs === "number") {
    const startSeconds = Math.max(0, Math.floor(match.startMs / 1000));
    const startMinutes = Math.floor(startSeconds / 60);
    const remainingSeconds = startSeconds % 60;

    if (typeof match.endMs === "number") {
      const endSeconds = Math.max(0, Math.floor(match.endMs / 1000));
      const endMinutes = Math.floor(endSeconds / 60);
      const remainingEndSeconds = endSeconds % 60;
      return ` ${startMinutes}:${String(remainingSeconds).padStart(2, "0")}-${endMinutes}:${String(remainingEndSeconds).padStart(2, "0")}`;
    }

    return ` ${startMinutes}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return "";
}

export function buildCitationMarkdown(
  citations: Array<{
    endMs?: number | null;
    fileId: string | null;
    page?: number | null;
    startMs?: number | null;
    workspacePath: string;
  }>
) {
  return citations
    .filter((citation) => Boolean(citation.fileId))
    .slice(0, 3)
    .map((citation) => {
      const label = `${citation.workspacePath}${formatCitationLocation(citation)}`;
      return `[${label}](workspace-file://${citation.fileId})`;
    })
    .join(", ");
}

export function sanitizeTaxonomyLabel(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function inferFlashcardTaxonomy(input: {
  query?: string;
  sourceText: string;
  title: string;
}): FlashcardTaxonomy {
  const haystack = `${input.title} ${input.query ?? ""} ${input.sourceText}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ");

  const subjectMatchers: Array<{ keywords: string[]; subject: string }> = [
    {
      keywords: ["physics", "quantum", "mechanics", "thermodynamics"],
      subject: "physics",
    },
    {
      keywords: ["chemistry", "molecule", "reaction", "organic", "gibbs"],
      subject: "chemistry",
    },
    {
      keywords: ["biology", "cell", "gene", "genetics", "evolution"],
      subject: "biology",
    },
    {
      keywords: [
        "calculus",
        "algebra",
        "geometry",
        "statistics",
        "probability",
      ],
      subject: "mathematics",
    },
    {
      keywords: ["history", "war", "revolution", "empire", "civilization"],
      subject: "history",
    },
    {
      keywords: ["economics", "market", "inflation", "finance", "trade"],
      subject: "economics",
    },
    {
      keywords: ["computer", "algorithm", "database", "network", "programming"],
      subject: "computer science",
    },
    {
      keywords: ["psychology", "behavior", "memory", "cognition", "emotion"],
      subject: "psychology",
    },
    {
      keywords: ["law", "contract", "tort", "liability", "statute"],
      subject: "law",
    },
  ];

  const matchedSubject =
    subjectMatchers.find((entry) =>
      entry.keywords.some((keyword) => haystack.includes(keyword))
    )?.subject ?? "general studies";

  const topicSource =
    input.query?.trim() || input.title.trim() || input.sourceText.trim();
  const topic = sanitizeTaxonomyLabel(topicSource || matchedSubject, 120);
  const concept = sanitizeTaxonomyLabel(
    topicSource || `${matchedSubject} core concept`,
    180
  );

  return (
    canonicalizeLearningTaxonomy({
      concept,
      subject: matchedSubject,
      text: [input.title, input.query ?? "", input.sourceText].join(" "),
      topic,
    }) ?? {
      concept,
      subject: matchedSubject,
      topic,
    }
  );
}
