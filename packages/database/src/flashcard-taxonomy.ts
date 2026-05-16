import { canonicalizeLearningTaxonomy } from "./learning-taxonomy";

export interface FlashcardTaxonomy {
  concept: string;
  subject: string;
  topic: string;
}

function sanitizeTaxonomyField(
  value: unknown,
  fieldName: keyof FlashcardTaxonomy
) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, fieldName === "concept" ? 180 : 120);
}

export function normalizeFlashcardTaxonomy(
  value: unknown
): FlashcardTaxonomy | null {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const subject = sanitizeTaxonomyField(record.subject, "subject");
  const topic = sanitizeTaxonomyField(record.topic, "topic");
  const concept = sanitizeTaxonomyField(record.concept, "concept");

  if (!(subject && topic && concept)) {
    return null;
  }

  return canonicalizeLearningTaxonomy({
    concept,
    subject,
    text: [subject, topic, concept].join(" "),
    topic,
  });
}

export function assertFlashcardTaxonomy(
  value: unknown,
  context: string
): FlashcardTaxonomy {
  const taxonomy = normalizeFlashcardTaxonomy(value);
  if (!taxonomy) {
    throw new Error(
      `Missing canonical flashcard taxonomy for ${context}: subject, topic, and concept are required.`
    );
  }

  return taxonomy;
}
