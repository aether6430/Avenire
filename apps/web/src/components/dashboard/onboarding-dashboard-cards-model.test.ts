import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const removedOnboardingDashboardCardsModelFile = path.resolve(
  import.meta.dirname,
  "./onboarding-dashboard-cards-model.ts"
);

const removedOnboardingStepPreviewFile = path.resolve(
  import.meta.dirname,
  "./onboarding-modal-step-preview.tsx"
);
const removedOnboardingMisconceptionsStepFile = path.resolve(
  import.meta.dirname,
  "./onboarding-modal-misconceptions-step.tsx"
);
const dashboardHomeMisconceptionDialogFile = path.resolve(
  import.meta.dirname,
  "./dashboard-home-misconception-dialog.tsx"
);
const dashboardSidebarWorkspaceHomeFile = path.resolve(
  import.meta.dirname,
  "./dashboard-sidebar-workspace-home.tsx"
);

describe("onboarding dashboard cards model", () => {
  it("keeps the dead onboarding dashboard cards model removed while the live dashboard copy still points at Methods and Mindset Sets", () => {
    const dashboardHomeMisconceptionDialogSource = readFileSync(
      dashboardHomeMisconceptionDialogFile,
      "utf8"
    );
    const dashboardSidebarWorkspaceHomeSource = readFileSync(
      dashboardSidebarWorkspaceHomeFile,
      "utf8"
    );

    expect(existsSync(removedOnboardingDashboardCardsModelFile)).toBe(false);
    expect(existsSync(removedOnboardingStepPreviewFile)).toBe(false);
    expect(existsSync(removedOnboardingMisconceptionsStepFile)).toBe(false);

    expect(dashboardHomeMisconceptionDialogSource).toContain(
      "Generate Mindset Set"
    );
    expect(dashboardHomeMisconceptionDialogSource).not.toContain(
      "Generate mindset set"
    );
    expect(dashboardSidebarWorkspaceHomeSource).toContain('label="New Method"');
    expect(dashboardSidebarWorkspaceHomeSource).toContain(
      'label="Open Mindset Sets"'
    );
  });
});
