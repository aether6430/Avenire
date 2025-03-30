declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GEMINI_API_KEY: string;
      TAVILY_API_KEY: string;
      OPENROUTER_API_KEY: string;
      GROQ_API_KEY: string;
      LINKUP_API_KEY: string;
    }
  }
}

export {}
