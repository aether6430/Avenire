#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  formatRatio,
  getExistingTargetDirs,
  ROOT,
  reportDirectory,
} from "./repo-metrics.mjs";

const COVERAGE_THRESHOLD = 0.1;
const COVERAGE_TARGETS = [
  {
    label: "@avenire/web",
    path: "apps/web",
    run: ["pnpm", "--filter", "@avenire/web", "test:coverage"],
    summaryPath: "apps/web/coverage/coverage-summary.json",
  },
  {
    label: "@avenire/auth",
    path: "packages/auth",
    run: ["pnpm", "--filter", "@avenire/auth", "test:coverage"],
    summaryPath: "packages/auth/coverage/coverage-summary.json",
  },
  {
    label: "@avenire/database",
    path: "packages/database",
    run: ["pnpm", "--filter", "@avenire/database", "test:coverage"],
    summaryPath: "packages/database/coverage/coverage-summary.json",
  },
  {
    label: "@avenire/ingestion",
    path: "packages/ingestion",
    run: ["pnpm", "--filter", "@avenire/ingestion", "test:coverage"],
    summaryPath: "packages/ingestion/coverage/coverage-summary.json",
  },
];

function runCoverageCommand(target) {
  execFileSync(target.run[0], target.run.slice(1), {
    cwd: ROOT,
    stdio: "inherit",
  });
}

function readCoverageSummary(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!existsSync(filePath)) {
    throw new Error(`Coverage summary not found: ${relativePath}`);
  }

  const summary = JSON.parse(readFileSync(filePath, "utf8"));
  const total = summary.total?.lines;
  if (
    !total ||
    typeof total.total !== "number" ||
    typeof total.covered !== "number"
  ) {
    throw new Error(
      `Coverage summary missing total line stats: ${relativePath}`
    );
  }

  return {
    covered: total.covered,
    total: total.total,
  };
}

function main() {
  console.log("Generating coverage summaries...");
  console.log("");

  for (const target of COVERAGE_TARGETS) {
    console.log(`- ${target.label}`);
    runCoverageCommand(target);
    console.log("");
  }

  const coverageReports = new Map(
    COVERAGE_TARGETS.map((target) => [
      target.path,
      { ...target, ...readCoverageSummary(target.summaryPath) },
    ])
  );

  const uncoveredReports = getExistingTargetDirs()
    .filter((target) => !coverageReports.has(target))
    .map((target) => {
      const { source } = reportDirectory(target);
      return {
        covered: 0,
        label: target,
        path: target,
        total: source,
      };
    });

  const totals = [...coverageReports.values(), ...uncoveredReports].reduce(
    (accumulator, report) => ({
      covered: accumulator.covered + report.covered,
      total: accumulator.total + report.total,
    }),
    { covered: 0, total: 0 }
  );

  console.log("Test Coverage Report");
  console.log("");
  console.log(
    "Repo lower bound uses real V8 line coverage where it exists and counts every remaining package as 0-covered source LOC."
  );
  console.log(
    "That makes the repo percentage conservative rather than flattering."
  );
  console.log("");
  console.log(`Repo covered lines (lower bound): ${totals.covered}`);
  console.log(`Repo denominator:                ${totals.total}`);
  console.log(
    `Repo lower-bound coverage:       ${formatRatio(totals.covered, totals.total)}`
  );
  console.log("");
  console.log("Direct coverage reports");
  for (const report of COVERAGE_TARGETS) {
    const summary = coverageReports.get(report.path);
    console.log(
      `${report.path}: covered=${summary.covered} total=${summary.total} ratio=${formatRatio(summary.covered, summary.total)}`
    );
  }
  console.log("");
  console.log("Counted as uncovered in the lower bound");
  for (const report of uncoveredReports) {
    console.log(
      `${report.path}: source-loc=${report.total} ratio=${formatRatio(0, report.total)}`
    );
  }
  console.log("");

  if (totals.total === 0) {
    console.error("No source or coverage totals were found.");
    process.exit(1);
  }

  if (totals.covered / totals.total < COVERAGE_THRESHOLD) {
    console.error(
      `Coverage floor not met: ${formatRatio(totals.covered, totals.total)} < ${(COVERAGE_THRESHOLD * 100).toFixed(0)}%`
    );
    process.exit(1);
  }

  console.log(
    `Coverage floor satisfied: ${formatRatio(totals.covered, totals.total)} >= ${(COVERAGE_THRESHOLD * 100).toFixed(0)}%`
  );
}

main();
