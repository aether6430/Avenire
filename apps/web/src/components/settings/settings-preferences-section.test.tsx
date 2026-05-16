import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsPreferencesSection } from "@/components/settings/settings-preferences-section";
import type { SettingsPanelRuntime } from "@/components/settings/use-settings-panel";

function createRuntime(
  overrides: Partial<SettingsPanelRuntime> = {}
): SettingsPanelRuntime {
  return {
    chatComposerSendMode: "enter",
    completedTasksAtTop: true,
    emailReceipts: true,
    persistUserSettings: async () => {},
    petAccessory: "none",
    petName: "Auri",
    preferencesLoadFailed: false,
    preferencesLoading: false,
    preferencesStatus: null,
    privacyMode: false,
    setChatComposerSendMode: () => {},
    setCompletedTasksAtTop: () => {},
    setEmailReceipts: () => {},
    setPetAccessory: () => {},
    setPetName: () => {},
    setPrivacyMode: () => {},
    setTheme: () => {},
    theme: "dark",
    ...overrides,
  } as unknown as SettingsPanelRuntime;
}

describe("SettingsPreferencesSection", () => {
  it("shows explicit loading copy instead of rendering remote preference controls with defaults", () => {
    const html = renderToStaticMarkup(
      <SettingsPreferencesSection
        runtime={createRuntime({ preferencesLoading: true })}
      />
    );

    expect(html).toContain("Loading preferences...");
    expect(html).toContain("Privacy mode");
    expect(html).toContain("Chat send shortcut");
    expect(html).not.toContain("Email me receipts");
    expect(html).not.toContain("Completed tasks");
    expect(html).not.toContain("Pet name");
  });

  it("shows explicit failure copy instead of rendering remote preference defaults", () => {
    const html = renderToStaticMarkup(
      <SettingsPreferencesSection
        runtime={createRuntime({ preferencesLoadFailed: true })}
      />
    );

    expect(html).toContain("Unable to load preferences.");
    expect(html).toContain("Privacy mode");
    expect(html).toContain("Chat send shortcut");
    expect(html).not.toContain("Email me receipts");
    expect(html).not.toContain("Completed tasks");
    expect(html).not.toContain("Pet name");
  });

  it("labels the pet customization section as pet-specific rather than AI-specific", () => {
    const html = renderToStaticMarkup(
      <SettingsPreferencesSection runtime={createRuntime()} />
    );

    expect(html).toContain("Personalize pet");
    expect(html).toContain(
      "Name your pet and choose an accessory for workspace surfaces."
    );
    expect(html).not.toContain("Personalize AI");
  });
});
