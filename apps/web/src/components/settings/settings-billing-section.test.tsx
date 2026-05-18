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

  it("renders loaded billing meters, receipts preferences, and paid-plan management copy", () => {
    const html = renderToStaticMarkup(
      <SettingsBillingSection
        runtime={createRuntime({
          billingMeters: [
            {
              label: "Total credits",
              refillAt: "2026-05-20T00:00:00.000Z",
              remaining: 1230,
              total: 2050,
            },
            {
              label: "Method credits",
              refillAt: "2026-05-20T00:00:00.000Z",
              remaining: 1200,
              total: 2000,
            },
            {
              label: "Upload credits",
              refillAt: "2026-05-20T00:00:00.000Z",
              remaining: 30,
              total: 50,
            },
          ],
          billingStatus: "Billing portal ready.",
          billingUsage: { plan: "core" } as never,
          currentPlanLabel: "Core Plan",
          emailReceipts: true,
          hasPaidPlan: true,
          preferencesStatus: "Preferences saved.",
        })}
      />
    );

    expect(html).toContain("Core Plan");
    expect(html).toContain("Total credits");
    expect(html).toContain("1,230");
    expect(html).toContain("/ 2,050");
    expect(html).toContain("Method credits");
    expect(html).toContain("Upload credits");
    expect(html).toContain("Email me receipts");
    expect(html).toContain("Preferences saved.");
    expect(html).toContain("Manage Billing &amp; Invoices");
    expect(html).toContain("Billing portal ready.");
  });

  it("uses the free-plan CTA when there is no paid plan", () => {
    const html = renderToStaticMarkup(
      <SettingsBillingSection
        runtime={createRuntime({
          billingUsage: { plan: "access" } as never,
          currentPlanLabel: "Free Plan",
          hasPaidPlan: false,
        })}
      />
    );

    expect(html).toContain("Free Plan");
    expect(html).toContain(">View Plans<");
    expect(html).not.toContain("Manage Billing &amp; Invoices");
  });
});
