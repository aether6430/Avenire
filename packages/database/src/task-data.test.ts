import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const taskDataSource = readFileSync(
  resolve(import.meta.dirname, "task-data.ts"),
  "utf8"
);

function functionSource(name: string, nextName: string) {
  const start = taskDataSource.indexOf(`export async function ${name}`);
  const end = taskDataSource.indexOf(
    `export async function ${nextName}`,
    start
  );

  if (start < 0 || end < 0) {
    throw new Error(`Could not locate ${name} source`);
  }

  return taskDataSource.slice(start, end);
}

describe("task due-date queries", () => {
  it("does not include undated tasks in due-before filters", () => {
    const source = functionSource("listTasksForUser", "listTasksDueToday");

    expect(source).toContain("if (options?.dueBefore)");
    expect(source).toContain("lte(task.dueAt, options.dueBefore)");
    expect(source).not.toContain("isNull(task.dueAt)");
  });

  it("does not include undated tasks in the due-today helper", () => {
    const source = functionSource("listTasksDueToday", "getTaskForUser");

    expect(source).toContain("lte(task.dueAt, today)");
    expect(source).not.toContain("isNull(task.dueAt)");
  });
});
