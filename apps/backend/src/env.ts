import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const backendRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = resolve(backendRoot, "../..");
const originalEnvKeys = new Set(Object.keys(process.env));

// Load file values into a scratch object so shell-exported variables keep precedence.
const fileEnv: Record<string, string> = {};

for (const envPath of [
  resolve(repoRoot, ".env"),
  resolve(backendRoot, ".env"),
  resolve(repoRoot, ".env.local"),
  resolve(backendRoot, ".env.local"),
]) {
  loadEnv({
    override: true,
    path: envPath,
    processEnv: fileEnv,
    quiet: true,
  });
}

for (const [key, value] of Object.entries(fileEnv)) {
  if (!originalEnvKeys.has(key)) {
    process.env[key] = value;
  }
}
