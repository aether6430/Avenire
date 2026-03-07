import { createMistral } from "@ai-sdk/mistral";
import { customProvider } from "ai";

const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY
});

export const fermion = customProvider({
  languageModels: {
    "fermion-sprint": mistral("mistral-small-latest"),
    "fermion-core": mistral("mistral-medium-latest"),
    "fermion-apex": mistral("mistral-large-latest"),
    "fermion-reasoning": mistral("mistral-large-latest"),
    "fermion-reasoning-lite": mistral("mistral-small-latest"),
  },
  fallbackProvider: mistral
});

export type FermionModelName =
  | "fermion-sprint"
  | "fermion-core"
  | "fermion-apex"
  | "fermion-reasoning"
  | "fermion-reasoning-lite";
