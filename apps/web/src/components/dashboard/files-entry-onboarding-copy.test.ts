import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const removedOnboardingUploadStepFile = path.resolve(
  import.meta.dirname,
  "./onboarding-modal-upload-step.tsx"
);
const workspaceHomeFile = path.resolve(
  import.meta.dirname,
  "./dashboard-sidebar-workspace-home.tsx"
);

describe("files onboarding copy", () => {
  it("uses Files wording on the live workspace entry action and keeps the dead onboarding upload step removed", () => {
    const source = readFileSync(workspaceHomeFile, "utf8");

    expect(source).toContain('label="Open Files"');
    expect(source).not.toContain("Open manage workspace");
    expect(existsSync(removedOnboardingUploadStepFile)).toBe(false);
  });
});
