import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const removedWrapperFile = resolve(
  import.meta.dirname,
  "./onboarding-modal.tsx"
);
const removedModelFile = resolve(
  import.meta.dirname,
  "./onboarding-modal-model.tsx"
);

describe("onboarding modal dead files", () => {
  it("keeps the dead onboarding modal wrapper and model removed after the runtime/surface purge", () => {
    expect(existsSync(removedWrapperFile)).toBe(false);
    expect(existsSync(removedModelFile)).toBe(false);
  });
});
