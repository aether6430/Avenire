import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { normalizePostgresConnectionString } from "./src/connection-string";

const currentDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDir, "../../.env") });
loadEnv({ path: resolve(currentDir, "../../.env.local"), override: true });

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
    url: normalizePostgresConnectionString(databaseUrl),
  },
});
