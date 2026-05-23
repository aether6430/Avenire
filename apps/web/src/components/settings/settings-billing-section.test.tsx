import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsBillingSection } from "@/components/settings/settings-billing-section";
import type { SettingsPanelRuntime } from "@/components/settings/use-settings-panel";

function createRuntime(
  overrides: Partial<SettingsPanelRuntime> = {}
): SettingsPanelRuntime {
  return {
    billingErrorMessage: null,
    billingLoadFailed: false,
    billingLoading: false,
    billingMeters: [],
    billingStatus: null,
    billingUsage: null,
    currentPlanLabel: "Loading plan",
    currentTab: "billing",
    emailReceipts: false,
    handleManageBilling: async () => {},
    handleUpgradePlan: async () => {},
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
  it("renders explicit loading billing and preferences states while the tab is hydrating", () => {
    const html = renderToStaticMarkup(
      <SettingsBillingSection
        runtime={createRuntime({
          billingLoading: true,
          billingStatus: "Loading usage...",
          currentPlanLabel: "Loading plan...",
          preferencesLoading: true,
        })}
      />
    );

    expect(html).toContain("Loading plan...");
    expect(html.match(/Loading\.\.\./g)?.length).toBe(2);
    expect(html.match(/Refills loading\.\.\./g)?.length).toBe(1);
    expect(html).toContain("Storage loading...");
    expect(html).toContain("Loading preferences...");
    expect(html).toContain("Loading usage...");
    expect(html).not.toContain("Unavailable");
  });

  it("renders explicit unavailable billing states instead of loading placeholders after a usage failure", () => {
    const html = renderToStaticMarkup(
      <SettingsBillingSection
        runtime={createRuntime({
          billingErrorMessage: "billing usage offline",
          billingLoadFailed: true,
          billingStatus: "billing usage offline",
          currentPlanLabel: "billing usage offline",
        })}
      />
    );

    expect(html.match(/billing usage offline/g)?.length).toBe(3);
    expect(html).not.toContain("Plan unavailable");
    expect(html).not.toContain(">Unavailable<");
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
              kind: "credits",
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
              kind: "credits",
              label: "Method credits",
              refillAt: "2026-05-20T00:00:00.000Z",
              remaining: 1200,
              total: 2000,
            },
            {
              kind: "storage",
              label: "Storage",
              remaining: 2048,
              total: 4096,
              used: 2048,
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
    expect(html).toContain("Method credits");
    expect(html).toContain("1,200");
    expect(html).toContain("/ 2,000");
    expect(html).toContain("Storage");
    expect(html).toContain("2.0 KB");
    expect(html).toContain("/ 4.0 KB");
    expect(html).toContain("2.0 KB available");
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

  it("keeps shared plan features aligned with Methods and Mindset Sets wording", () => {
    const html = renderToStaticMarkup(
      <SettingsBillingSection
        runtime={createRuntime({
          currentPlanLabel: "Access Plan",
        })}
      />
    );

    expect(html).toContain("Methods, notes, and workspace search");
    expect(html).toContain("Mindset Sets with spaced repetition");
    expect(html).not.toContain("Full workspace with file &amp; note search");
    expect(html).not.toContain("Flashcards with spaced repetition");
  });
});
