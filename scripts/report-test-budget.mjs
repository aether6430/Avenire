#!/usr/bin/env node

import {
  formatRatio,
  getExistingTargetDirs,
  reportDirectory,
} from "./repo-metrics.mjs";

const SOURCE_THRESHOLD = 0.25;

function main() {
  const reports = getExistingTargetDirs().map(reportDirectory);
  const overBudgetPackages = reports.filter(
    (report) => report.source > 0 && report.ratio > SOURCE_THRESHOLD
  );

  const repoCounts = reports.reduce(
    (totals, report) => ({
      source: totals.source + report.source,
      test: totals.test + report.test,
    }),
    { source: 0, test: 0 }
  );

  console.log("Test Budget Report");
  console.log("");
  console.log(`Repo source LOC: ${repoCounts.source}`);
  console.log(`Repo test LOC:   ${repoCounts.test}`);
  console.log(
    `Repo ratio:      ${formatRatio(repoCounts.test, repoCounts.source)}`
  );
  console.log("");
  console.log("Per package");
  for (const report of reports) {
    console.log(
      `${report.path}: source=${report.source} test=${report.test} ratio=${formatRatio(report.test, report.source)}`
    );
  }
  console.log("");

  if (repoCounts.source === 0) {
    console.log("No source files found.");
    process.exit(1);
  }

  if (overBudgetPackages.length > 0) {
    console.error("Per-package test budget exceeded:");
    for (const report of overBudgetPackages) {
      console.error(
        `- ${report.path}: ${formatRatio(report.test, report.source)} > ${(SOURCE_THRESHOLD * 100).toFixed(0)}%`
      );
    }
    process.exit(1);
  }

  if (repoCounts.test / repoCounts.source > SOURCE_THRESHOLD) {
    console.error(
      `Test budget exceeded: ${formatRatio(repoCounts.test, repoCounts.source)} > ${(SOURCE_THRESHOLD * 100).toFixed(0)}%`
    );
    process.exit(1);
  }

  console.log(
    `Test budget satisfied: repo ${formatRatio(repoCounts.test, repoCounts.source)} <= ${(SOURCE_THRESHOLD * 100).toFixed(0)}%, and every package is within the same ceiling`
  );
}

main();
