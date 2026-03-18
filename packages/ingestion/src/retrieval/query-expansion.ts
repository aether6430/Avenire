import { type ApolloModelName, apollo, generateText } from "@avenire/ai";

const QUERY_EXPANSION_MODEL: ApolloModelName = "apollo-tiny";
const MAX_EXPANSIONS = 5;
const CODE_FENCE_START_PATTERN = /^```(?:json|text)?\s*/i;
const CODE_FENCE_END_PATTERN = /\s*```$/i;

function normalizeExpansion(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripCodeFences(value: string) {
  return value
    .replace(CODE_FENCE_START_PATTERN, "")
    .replace(CODE_FENCE_END_PATTERN, "")
    .trim();
}

export function parseQueryExpansions(value: string): string[] {
  const normalizedValue = stripCodeFences(value);
  if (!normalizedValue) {
    return [];
  }

  const parsedCandidates = (() => {
    try {
      const parsed = JSON.parse(normalizedValue) as unknown;
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Fall through to line parsing.
    }

    return normalizedValue.split(/\r?\n+/g);
  })();

  const seen = new Set<string>();
  const out: string[] = [];

  for (const candidate of parsedCandidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const normalized = normalizeExpansion(
      candidate.replace(/^(?:[-*•]|\d+[.)])\s*/g, "")
    );
    if (!normalized || seen.has(normalized.toLowerCase())) {
      continue;
    }

    seen.add(normalized.toLowerCase());
    out.push(normalized);

    if (out.length >= MAX_EXPANSIONS) {
      break;
    }
  }

  return out;
}

export async function expandQuery(query: string): Promise<string[]> {
  const normalizedQuery = normalizeExpansion(query);
  if (!normalizedQuery) {
    return [];
  }

  const { text } = await generateText({
    model: apollo.languageModel(QUERY_EXPANSION_MODEL),
    prompt: [
      "Generate alternate search phrasings for the user query.",
      "Return only JSON: an array of 3 to 5 short search queries.",
      "Rules:",
      "- Keep each phrase concise.",
      "- Preserve the same intent.",
      "- Do not add explanations or numbering.",
      "- Do not repeat the original query verbatim.",
      `Query: ${normalizedQuery}`,
    ].join("\n"),
    temperature: 0.2,
    maxOutputTokens: 128,
  });

  return parseQueryExpansions(text).filter(
    (candidate) => candidate.toLowerCase() !== normalizedQuery.toLowerCase()
  );
}
