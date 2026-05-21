import { describe, expect, it } from "vitest";
import {
  createSettingsSessionFallback,
  formatBytes,
  formatCredits,
  formatRefillAt,
  KEYBOARD_SHORTCUT_GROUPS,
  SETTINGS_TABS,
} from "@/components/settings/settings-panel-model";

describe("settings panel model", () => {
  it("keeps tab metadata and formatting helpers stable", () => {
    expect(SETTINGS_TABS.map((tab) => tab.key)).toEqual([
      "account",
      "preferences",
      "workspace",
      "data",
      "billing",
      "security",
      "shortcuts",
    ]);
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatCredits(1234.4)).toBe("1,234");
    expect(formatRefillAt(null)).toBe("No scheduled refill");
    expect(KEYBOARD_SHORTCUT_GROUPS[0]?.items[1]?.label).toBe("Open Files");
  });

  it("creates an explicit session fallback from a bootstrapped workspace user", () => {
    expect(
      createSettingsSessionFallback({
        avatar: "https://cdn.avenire.app/avatar.png",
        email: "owner@example.com",
        id: "user-1",
        name: "Owner",
      })
    ).toEqual({
      user: {
        email: "owner@example.com",
        id: "user-1",
        image: "https://cdn.avenire.app/avatar.png",
        name: "Owner",
      },
    });
    expect(createSettingsSessionFallback(null)).toBeNull();
  });
});
