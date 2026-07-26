import { resolve } from "node:path";
import { Effect } from "effect-v4";
import { generateOfficeFixtures } from "../office-fixtures";

const outputRoot = resolve(import.meta.dirname, "../../data/generated");

const program = generateOfficeFixtures(outputRoot).pipe(
  Effect.tap((fixtures) =>
    Effect.sync(() => {
      console.log(JSON.stringify(fixtures, null, 2));
    })
  )
);

Effect.runPromise(program).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
