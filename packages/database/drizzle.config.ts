import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";
import { loadDatabaseEnv } from "./src/load-env";

const currentDir = dirname(fileURLToPath(import.meta.url));
loadDatabaseEnv({ packageRootDir: currentDir });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is missing. Add it to /home/apollo/Code/avenire/.env (or export it in your shell)."
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/schema.ts", "./src/auth-schema.ts"],
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
