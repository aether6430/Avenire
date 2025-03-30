import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGroq, groq } from '@ai-sdk/groq';
import { customProvider, wrapLanguageModel, extractReasoningMiddleware } from "ai"


const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY
})

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});


export const fermion = customProvider({
  languageModels: {
    "fermion-sprint": google("gemma-3-27b-it"),
    "fermion-core": google("gemini-2.0-flash-001"),
    "fermion-apex": google("gemini-2.0-pro-exp-02-05"),
    "fermion-reasoning": openrouter.languageModel("deepseek/deepseek-r1:free", {
      reasoning: {
        exclude: false,
        effort: "medium",
      },
    }),
    "fermion-reasoning-lite": wrapLanguageModel({
      model: createGroq({
        apiKey: process.env.GROQ_API_KEY
      }).languageModel("deepseek-r1-distill-llama-70b"),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    })
  },
  fallbackProvider: google,
});
