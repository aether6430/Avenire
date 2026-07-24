import { apollo, generateText } from "@avenire/ai";
import { config } from "../config";

const QUERY_EXPANSION_MODEL = "apollo-tiny";
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

export async function expandQuery(
  query: string,
  options?: { abortSignal?: AbortSignal }
): Promise<string | null> {
  const normalizedQuery = normalizeExpansion(query);
  if (!normalizedQuery) {
    return null;
  }

  const { text } = await generateText({
    abortSignal: options?.abortSignal,
    model: apollo.languageModel(QUERY_EXPANSION_MODEL),
    system:
      "Rewrite the student query as one standalone academic search sentence. Preserve every named entity, technical term, symbol, number, and constraint from the original; add only useful domain synonyms or expanded terminology. Never summarize to a broader topic. Output only the rewritten sentence.",
    prompt: normalizedQuery,
    temperature: 0.2,
    maxOutputTokens: 256,
  });

  const stripped = stripCodeFences(text);
  const expanded =
    stripped
      .split(/\n+/)
      .map((line) =>
        normalizeExpansion(line.replace(/^(?:[-*•]|\d+[.)])\s*/g, ""))
      )
      .find(Boolean) ?? "";

  if (!expanded || expanded.toLowerCase() === normalizedQuery.toLowerCase()) {
    return null;
  }

  return expanded;
}

export async function generateHydeDocument(
  query: string,
  options?: { abortSignal?: AbortSignal }
): Promise<string | null> {
  const normalizedQuery = normalizeExpansion(query);
  if (!(normalizedQuery && config.retrievalHydeEnabled)) {
    return null;
  }

  const { text } = await generateText({
    abortSignal: options?.abortSignal,
    model: apollo.languageModel(QUERY_EXPANSION_MODEL),
    system: [
      "Write a concise hypothetical source excerpt that would directly answer this student search query.",
      "Make it factual-sounding but generic, include likely technical terms, and do not mention that it is hypothetical.",
      "Output only the excerpt.",
    ].join(" "),
    prompt: normalizedQuery,
    temperature: 0.2,
    maxOutputTokens: Math.max(512, config.retrievalHydeMaxOutputTokens),
  });

  const hydeDocument = normalizeExpansion(stripCodeFences(text));
  if (!hydeDocument) {
    return null;
  }

  return hydeDocument.toLowerCase() === normalizedQuery.toLowerCase()
    ? null
    : hydeDocument;
}
