import { createCohere } from "@ai-sdk/cohere";
import { createFireworks } from "@ai-sdk/fireworks";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { customProvider } from "ai";

const APOLLO_MODEL_SPRINT = "apollo-sprint";
const APOLLO_MODEL_CORE = "apollo-core";
const APOLLO_MODEL_APEX = "apollo-apex";
const APOLLO_MODEL_AGENT = "apollo-agent";
const APOLLO_MODEL_META = "apollo-meta";
const APOLLO_MODEL_TINY = "apollo-tiny";

export const APOLLO_INGESTION_MISTRAL_OCR_MODEL = "mistral-ocr-latest";
export const APOLLO_INGESTION_MISTRAL_IMAGE_DESCRIPTION_MODEL =
  "pixtral-large-latest";
export const APOLLO_INGESTION_GROQ_TRANSCRIPTION_MODEL =
  "whisper-large-v3-turbo";
export const APOLLO_INGESTION_COHERE_EMBED_MODEL = "embed-v4.0";

export type ApolloModelName =
  | typeof APOLLO_MODEL_SPRINT
  | typeof APOLLO_MODEL_CORE
  | typeof APOLLO_MODEL_APEX
  | typeof APOLLO_MODEL_AGENT
  | typeof APOLLO_MODEL_META
  | typeof APOLLO_MODEL_TINY;

export const APOLLO_LANGUAGE_MODEL_IDS: Record<ApolloModelName, string> = {
  "apollo-agent": "accounts/fireworks/models/glm-5",
  "apollo-apex": "accounts/fireworks/models/kimi-k2p5",
  "apollo-core": "gemini-3-flash-preview",
  "apollo-meta": "openai/gpt-oss-120b",
  "apollo-sprint": "mistral-small-latest",
  "apollo-tiny": "ministral-3b-2512",
};

const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY,
});
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});
const fireworks = createFireworks({
  apiKey: process.env.FIREWORKS_API_KEY,
});
export const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});
const cohere = createCohere({
  apiKey: process.env.COHERE_API_KEY,
});

export const apollo = customProvider({
  languageModels: {
    "apollo-sprint": mistral("mistral-small-latest"),
    "apollo-apex": fireworks(APOLLO_LANGUAGE_MODEL_IDS["apollo-apex"]),
    "apollo-core": gemini("gemini-3-flash-preview"),
    "apollo-agent": fireworks("accounts/fireworks/models/glm-5"),
    "apollo-meta": groq(APOLLO_LANGUAGE_MODEL_IDS["apollo-meta"]),
    "apollo-tiny": mistral("ministral-3b-2512"),
  },
  embeddingModels: {},
  rerankingModels: {
    "apollo-reranking": cohere.reranking("rerank-v3.5"),
  },
  transcriptionModels: {
    "apollo-transcript": groq.transcription(
      APOLLO_INGESTION_GROQ_TRANSCRIPTION_MODEL
    ),
  },
  fallbackProvider: mistral,
});
