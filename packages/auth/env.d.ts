declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BETTER_AUTH_SECRET: string;
      BASE_URL: string;
      BETTER_AUTH_TRUST_HOST: string;
      AUTH_GOOGLE_ID: string;
      AUTH_GOOGLE_SECRET: string;
      AUTH_GITHUB_ID: string;
      AUTH_GITHUB_SECRET: string;
    }
  }
}

export {}
