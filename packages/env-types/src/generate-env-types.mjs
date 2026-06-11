import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageDir, "../..");
const envPath = resolve(repoRoot, ".env.example");
const outPath = resolve(packageDir, "index.d.ts");
const checkOnly = process.argv.includes("--check");

const content = readFileSync(envPath, "utf8");
const keys = content
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#") && line.includes("="))
  .map((line) => line.split("=")[0]);

const uniqueKeys = [...new Set(keys)].sort();

const ignoredDirectories = new Set([
  ".git",
  ".next",
  "coverage",
  "dist",
  "node_modules",
]);
const sourceExtensions = new Set([".cjs", ".js", ".mjs", ".ts", ".tsx"]);

function collectUsedEnvKeys(directory, found = new Set()) {
  if (!existsSync(directory)) {
    return found;
  }

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        collectUsedEnvKeys(resolve(directory, entry.name), found);
      }
      continue;
    }

    if (
      !sourceExtensions.has(extname(entry.name)) ||
      entry.name.includes(".test.") ||
      entry.name.includes(".spec.")
    ) {
      continue;
    }

    const source = readFileSync(resolve(directory, entry.name), "utf8");
    for (const match of source.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      found.add(match[1]);
    }
    for (const match of source.matchAll(
      /process\.env\[['"]([A-Z0-9_]+)['"]\]/g
    )) {
      found.add(match[1]);
    }
  }

  return found;
}

const usedKeys = new Set([
  ...collectUsedEnvKeys(resolve(repoRoot, "apps")),
  ...collectUsedEnvKeys(resolve(repoRoot, "packages")),
]);
const documentedKeys = new Set(uniqueKeys);
const missingKeys = [...usedKeys]
  .filter((key) => !documentedKeys.has(key))
  .sort();

if (missingKeys.length > 0) {
  console.error(
    `Environment variables used in source but missing from .env.example:\n${missingKeys.join("\n")}`
  );
  process.exit(1);
}

const body = `/// <reference path="./react-overrides.d.ts" />

// biome-ignore lint/style/noNamespace: Node environment declarations augment the global namespace.
declare namespace NodeJS {
  // biome-ignore assist/source/useSortedInterfaceMembers: Members are generated from sorted environment keys.
  interface ProcessEnv {
${uniqueKeys.map((key) => `    ${key}?: string;`).join("\n")}
  }
  interface Process {
    env: ProcessEnv;
  }
}

declare const process: NodeJS.Process;
`;

if (checkOnly) {
  const current = readFileSync(outPath, "utf8");
  if (current !== body) {
    console.error(
      "packages/env-types/index.d.ts is stale. Run pnpm --filter @avenire/env-types generate."
    );
    process.exit(1);
  }
  console.log(
    `Verified ${uniqueKeys.length} documented environment variables and generated types.`
  );
} else {
  writeFileSync(outPath, body, "utf8");
  console.log(`Generated ${outPath} with ${uniqueKeys.length} env keys.`);
}
