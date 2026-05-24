export const MISCONCEPTION_REQUIRED_FIELDS_ERROR =
  "Concept, subject, and topic are required";

function normalizeMisconceptionText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseMisconceptionImproveInput(input: {
  concept?: unknown;
  delta?: unknown;
  decay?: unknown;
  resolveThreshold?: unknown;
  subject?: unknown;
  topic?: unknown;
}):
  | {
      success: true;
      data: {
        concept: string;
        delta: number | undefined;
        decay: number | undefined;
        resolveThreshold: number | undefined;
        subject: string;
        topic: string;
      };
    }
  | {
      success: false;
      error: string;
    } {
  const concept = normalizeMisconceptionText(input.concept);
  const subject = normalizeMisconceptionText(input.subject);
  const topic = normalizeMisconceptionText(input.topic);

  if (!(concept && subject && topic)) {
    return {
      success: false,
      error: MISCONCEPTION_REQUIRED_FIELDS_ERROR,
    };
  }

  return {
    success: true,
    data: {
      concept,
      delta: normalizeOptionalNumber(input.delta),
      decay: normalizeOptionalNumber(input.decay),
      resolveThreshold: normalizeOptionalNumber(input.resolveThreshold),
      subject,
      topic,
    },
  };
}

export function parseMisconceptionResolveInput(input: {
  concept?: unknown;
  subject?: unknown;
  topic?: unknown;
}):
  | {
      success: true;
      data: {
        concept: string;
        subject: string;
        topic: string;
      };
    }
  | {
      success: false;
      error: string;
    } {
  const concept = normalizeMisconceptionText(input.concept);
  const subject = normalizeMisconceptionText(input.subject);
  const topic = normalizeMisconceptionText(input.topic);

  if (!(concept && subject && topic)) {
    return {
      success: false,
      error: MISCONCEPTION_REQUIRED_FIELDS_ERROR,
    };
  }

  return {
    success: true,
    data: {
      concept,
      subject,
      topic,
    },
  };
}

export function resolveMisconceptionRouteError(
  error: unknown,
  options: {
    fallback: string;
    status?: number;
  }
) {
  return {
    error: error instanceof Error ? error.message : options.fallback,
    status: options.status ?? 500,
  };
}
