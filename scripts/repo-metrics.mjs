import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export const ROOT = process.cwd();
export const CODE_FILE_PATTERN = /\.(ts|tsx|js|jsx)$/;
export const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx)$/;
export const EXCLUDED_DIRS = new Set([
  ".git",
  ".next",
  "coverage",
  "coverage-all",
  "dist",
  "node_modules",
]);
export const TARGET_DIRS = [
  "apps/backend",
  "apps/emails",
  "apps/extension",
  "apps/web",
  "packages/ai",
  "packages/auth",
  "packages/database",
  "packages/ingestion",
  "packages/observability",
  "packages/payments",
  "packages/storage",
  "packages/ui",
];

export function countLines(filePath) {
  const text = readFileSync(filePath, "utf8");
  if (text.length === 0) {
    return 0;
  }
  return text.split("\n").length;
}

export function walkCode(dir, counts = { source: 0, test: 0 }) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkCode(fullPath, counts);
      continue;
    }

    if (!entry.isFile() || !CODE_FILE_PATTERN.test(entry.name)) {
      continue;
    }

    const lineCount = countLines(fullPath);
    if (TEST_FILE_PATTERN.test(entry.name)) {
      counts.test += lineCount;
    } else {
      counts.source += lineCount;
    }
  }

  return counts;
}

export function reportDirectory(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir);
  const counts = walkCode(absoluteDir);
  return {
    ...counts,
    path: relativeDir,
    ratio: counts.source === 0 ? 0 : counts.test / counts.source,
  };
}

export function getExistingTargetDirs() {
  return TARGET_DIRS.filter((target) => existsSync(path.join(ROOT, target)));
}

export function formatRatio(numerator, denominator) {
  if (denominator === 0) {
    return "0.00%";
  }
  return `${((numerator / denominator) * 100).toFixed(2)}%`;
}
