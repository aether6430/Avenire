import { type ApolloModelName, apollo, generateText } from "@avenire/ai";

const QUERY_EXPANSION_MODEL: ApolloModelName = "apollo-tiny";
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

export async function expandQuery(query: string): Promise<string | null> {
  const normalizedQuery = normalizeExpansion(query);
  if (!normalizedQuery) {
    return null;
  }

  const { text } = await generateText({
    model: apollo.languageModel(QUERY_EXPANSION_MODEL),
    system:
      "Expand this student query into a full academic search phrase. Output only the expanded query, nothing else.",
    prompt: normalizedQuery,
    temperature: 0.2,
    maxOutputTokens: 64,
  });

  const expanded = normalizeExpansion(
    stripCodeFences(text).replace(/^(?:[-*•]|\d+[.)])\s*/g, "")
  );

  if (!expanded || expanded.toLowerCase() === normalizedQuery.toLowerCase()) {
    return null;
  }

  return expanded;
}
