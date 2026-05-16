import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsBillingSection } from "@/components/settings/settings-billing-section";
import type { SettingsPanelRuntime } from "@/components/settings/use-settings-panel";

function createRuntime(
  overrides: Partial<SettingsPanelRuntime> = {}
): SettingsPanelRuntime {
  return {
    billingLoadFailed: false,
    billingLoading: false,
    billingMeters: [],
    billingStatus: null,
    billingUsage: null,
    currentPlanLabel: "Loading plan",
    currentTab: "billing",
    emailReceipts: false,
    handleManageBilling: async () => {},
    hasPaidPlan: false,
    persistUserSettings: async () => {},
    preferencesLoadFailed: false,
    preferencesLoading: false,
    preferencesStatus: null,
    router: { push: () => {} },
    setEmailReceipts: () => {},
    ...overrides,
  } as unknown as SettingsPanelRuntime;
}

describe("SettingsBillingSection", () => {
  it("renders explicit unavailable billing states instead of loading placeholders after a usage failure", () => {
    const html = renderToStaticMarkup(
      <SettingsBillingSection
        runtime={createRuntime({
          billingLoadFailed: true,
          billingStatus: "Unable to load billing usage.",
          currentPlanLabel: "Plan unavailable",
        })}
      />
    );

    expect(html).toContain("Unable to load billing usage.");
    expect(html).toContain("Plan unavailable");
    expect(html.match(/Unavailable/g)?.length).toBe(3);
    expect(html).not.toContain("Loading plan");
  });

  it("shows explicit preference failure copy instead of a default receipts toggle", () => {
    const html = renderToStaticMarkup(
      <SettingsBillingSection
        runtime={createRuntime({
          billingStatus: null,
          currentPlanLabel: "Core Plan",
          preferencesLoadFailed: true,
        })}
      />
    );

    expect(html).toContain("Unable to load preferences.");
    expect(html).not.toContain("Email me receipts");
  });

  it("uses Methods wording for the study-session credit meter", () => {
    const html = renderToStaticMarkup(
      <SettingsBillingSection
        runtime={createRuntime({
          billingMeters: [
            {
              label: "Method credits",
              refillLabel: "Refills monthly",
              totalLabel: "40",
              valueState: {
                label: "10",
                showSpinner: false,
              },
            },
          ],
          currentPlanLabel: "Core Plan",
        })}
      />
    );

    expect(html).toContain("Method credits");
    expect(html).not.toContain("Chat credits");
  });
});
