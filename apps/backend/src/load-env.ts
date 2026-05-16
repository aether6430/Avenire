import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

const defaultBackendDir = dirname(fileURLToPath(import.meta.url));

export function getBackendEnvFilePaths(backendDir = defaultBackendDir) {
  const backendAppDir = resolve(backendDir, "..");
  const repoRoot = resolve(backendDir, "../../..");

  return [
    resolve(repoRoot, ".env"),
    resolve(backendAppDir, ".env"),
    resolve(repoRoot, ".env.local"),
    resolve(backendAppDir, ".env.local"),
  ];
}

export function loadBackendEnv(options?: {
  backendDir?: string;
  processEnv?: NodeJS.ProcessEnv;
}) {
  const processEnv = options?.processEnv ?? process.env;
  const protectedKeys = new Set(
    Object.keys(processEnv).filter((key) => processEnv[key] !== undefined)
  );

  for (const path of getBackendEnvFilePaths(options?.backendDir)) {
    if (!existsSync(path)) {
      continue;
    }

    const parsed = parse(readFileSync(path));

    for (const [key, value] of Object.entries(parsed)) {
      if (protectedKeys.has(key)) {
        continue;
      }

      processEnv[key] = value;
    }
  }
}
