export interface LearningTaxonomy {
  concept: string;
  subject: string;
  topic: string;
}

function normalizeWhitespace(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function sanitizeLabel(
  value: unknown,
  maxLength: number,
  transform?: (value: string) => string
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return null;
  }

  const nextValue = transform ? transform(normalized) : normalized;
  return nextValue.slice(0, maxLength);
}

export function canonicalizeSubjectLabel(value: string | null | undefined) {
  return sanitizeLabel(value ?? null, 120, (label) =>
    titleCase(label.toLowerCase())
  );
}

export function canonicalizeLearningTaxonomy(input: {
  concept?: string | null | undefined;
  subject?: string | null | undefined;
  text?: string | null | undefined;
  topic?: string | null | undefined;
}): LearningTaxonomy | null {
  const subject = canonicalizeSubjectLabel(input.subject ?? null);
  const topic = sanitizeLabel(input.topic ?? null, 120, (label) =>
    titleCase(label.toLowerCase())
  );
  const concept = sanitizeLabel(input.concept ?? null, 180);

  if (!(subject && topic && concept)) {
    return null;
  }

  return {
    concept,
    subject,
    topic,
  };
}
