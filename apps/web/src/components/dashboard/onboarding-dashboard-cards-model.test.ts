import { describe, expect, it } from "vitest";
import { getOnboardingDashboardCards } from "./onboarding-dashboard-cards-model";

describe("onboarding dashboard cards model", () => {
  it("keeps the dashboard sample cards aligned with current product actions", () => {
    expect(getOnboardingDashboardCards()).toEqual([
      {
        action: "Open Method",
        bg: "border-border/70 bg-background",
        kind: "chat-probe",
        sub: "Gauss' Law · Electric Flux",
        title: "Fix your misconception",
      },
      {
        action: "Start Review",
        bg: "border-border/70 bg-background",
        kind: "review",
        sub: "Based on your FSRS schedule",
        title: "5 mindset cards due today",
      },
      {
        action: "Open Mindset Set",
        bg: "border-border/70 bg-background",
        kind: "mindset-set",
        sub: "Electrostatics - Chapter 1",
        title: "Revisit your mindset set",
      },
    ]);
  });
});
