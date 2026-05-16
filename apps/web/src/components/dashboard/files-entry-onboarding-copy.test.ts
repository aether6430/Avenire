import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const onboardingStepsFile = path.resolve(
  import.meta.dirname,
  "./onboarding-modal-steps.tsx"
);

describe("files onboarding copy", () => {
  it("uses Files wording for the onboarding workspace entry action", () => {
    const source = readFileSync(onboardingStepsFile, "utf8");

    expect(source).toContain("Open files workspace");
    expect(source).not.toContain("Open manage workspace");
  });
});
