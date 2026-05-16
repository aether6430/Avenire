import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

const defaultPackageRootDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  ".."
);

export function getDatabaseEnvFilePaths(
  packageRootDir = defaultPackageRootDir
) {
  const repoRoot = resolve(packageRootDir, "../..");

  return [
    resolve(repoRoot, ".env"),
    resolve(packageRootDir, ".env"),
    resolve(repoRoot, ".env.local"),
    resolve(packageRootDir, ".env.local"),
  ];
}

export function loadDatabaseEnv(options?: {
  packageRootDir?: string;
  processEnv?: NodeJS.ProcessEnv;
}) {
  const processEnv = options?.processEnv ?? process.env;
  const protectedKeys = new Set(
    Object.keys(processEnv).filter((key) => processEnv[key] !== undefined)
  );

  for (const path of getDatabaseEnvFilePaths(options?.packageRootDir)) {
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
