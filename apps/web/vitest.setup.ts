import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({
  override: true,
  path: resolve(process.cwd(), "../../.env.test"),
  quiet: true,
});

const testEnvDefaults: Record<string, string> = {
  BETTER_AUTH_SECRET: "test-better-auth-secret",
  BETTER_AUTH_URL: "http://localhost:3000",
  DATABASE_URL: "postgres://avenire_test@localhost:5432/avenire_test",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NODE_ENV: "test",
};

for (const [key, value] of Object.entries(testEnvDefaults)) {
  process.env[key] ??= value;
}
