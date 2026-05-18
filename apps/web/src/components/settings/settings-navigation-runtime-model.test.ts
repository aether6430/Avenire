import { describe, expect, it } from "vitest";
import {
  resolveMobileSettingsTabs,
  resolveVisibleSettingsTabs,
  shouldRedirectShortcutSettingsTab,
  shouldSyncSettingsLocalTab,
} from "@/components/settings/settings-navigation-runtime-model";

describe("settings navigation runtime model", () => {
  it("detects when local tab state must sync with the requested tab", () => {
    expect(
      shouldSyncSettingsLocalTab({
        initialTab: "billing",
        localTab: "account",
      })
    ).toBe(true);
    expect(
      shouldSyncSettingsLocalTab({
        initialTab: "billing",
        localTab: "billing",
      })
    ).toBe(false);
  });

  it("redirects away from shortcuts only when no keyboard was detected", () => {
    expect(
      shouldRedirectShortcutSettingsTab({
        currentTab: "shortcuts",
        hasKeyboardDetected: false,
      })
    ).toBe(true);
    expect(
      shouldRedirectShortcutSettingsTab({
        currentTab: "shortcuts",
        hasKeyboardDetected: true,
      })
    ).toBe(false);
  });

  it("derives visible and mobile settings tabs from keyboard availability", () => {
    const visibleWithoutKeyboard = resolveVisibleSettingsTabs(false);
    const visibleWithKeyboard = resolveVisibleSettingsTabs(true);

    expect(visibleWithoutKeyboard.some((tab) => tab.key === "shortcuts")).toBe(
      false
    );
    expect(visibleWithKeyboard.some((tab) => tab.key === "shortcuts")).toBe(
      true
    );

    const mobileTabs = resolveMobileSettingsTabs(visibleWithKeyboard);
    expect(
      mobileTabs.every((tab) => !("mobileHidden" in tab && tab.mobileHidden))
    ).toBe(true);
  });
});
