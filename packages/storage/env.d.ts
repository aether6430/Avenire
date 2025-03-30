declare global {
  namespace NodeJS {
    interface ProcessEnv {
      UPLOADTHING_TOKEN: string;
    }
  }
}

export {}
