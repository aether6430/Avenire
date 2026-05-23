import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const taskAssigneePickerFile = resolve(
  import.meta.dirname,
  "./task-assignee-picker.tsx"
);
const taskResourcePickerFile = resolve(
  import.meta.dirname,
  "./task-resource-picker.tsx"
);
const removedHelperFile = resolve(
  import.meta.dirname,
  "./task-picker-empty-state.ts"
);

describe("task picker empty state copy", () => {
  it("keeps the live assignee picker on explicit workspace-member search copy after the dead helper removal", () => {
    const source = readFileSync(taskAssigneePickerFile, "utf8");

    expect(source).toContain("Unable to load workspace members.");
    expect(source).toContain("No workspace member matches that search.");
    expect(existsSync(removedHelperFile)).toBe(false);
  });

  it("keeps the live resource picker on explicit resource search copy after the dead helper removal", () => {
    const source = readFileSync(taskResourcePickerFile, "utf8");

    expect(source).toContain("Loading resources...");
    expect(source).toContain("Unable to load task resources.");
    expect(source).toContain("No resources match that search.");
  });
});
