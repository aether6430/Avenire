import { resolve } from "node:path";
import { Effect } from "effect-v4";
import {
  BenchmarkDataError,
  BenchmarkFileSystem,
  BenchmarkFileSystemLive,
  loadBenchmarkContracts,
  loadBenchmarkRun,
} from "../integrity";
import { buildBenchmarkReport } from "../report";

const runArgument = process.argv[2];
const outputArgument = process.argv[3];
const dataRoot = resolve(import.meta.dirname, "../../data");

const program = Effect.gen(function* () {
  if (!runArgument) {
    return yield* Effect.fail(
      BenchmarkDataError.make({
        path: "<run.json>",
        message: "Usage: report:run <run.json> [report.json]",
      })
    );
  }
  const runPath = resolve(process.cwd(), runArgument);
  const { dataset, manifest } = yield* loadBenchmarkContracts(dataRoot);
  const run = yield* loadBenchmarkRun(runPath);
  const report = buildBenchmarkReport({ dataset, manifest, run });
  const json = `${JSON.stringify(report, null, 2)}\n`;

  if (outputArgument) {
    const fileSystem = yield* BenchmarkFileSystem;
    const outputPath = resolve(process.cwd(), outputArgument);
    yield* fileSystem.writeBytesAtomic(
      outputPath,
      new TextEncoder().encode(json)
    );
  } else {
    yield* Effect.sync(() => process.stdout.write(json));
  }
});

program
  .pipe(Effect.provide(BenchmarkFileSystemLive), Effect.runPromise)
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  });
