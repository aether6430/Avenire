import { resolve } from "node:path";
import { Effect } from "effect-v4";
import { importDatabaseCorpus } from "../import-database-corpus";
import { BenchmarkFileSystemLive } from "../integrity";

const dataRoot = resolve(import.meta.dirname, "../../data");

importDatabaseCorpus(dataRoot)
  .pipe(Effect.provide(BenchmarkFileSystemLive), Effect.runPromise)
  .then((summary) => {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  })
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  });
