import { describe, expect, it } from "vitest";
import {
  createSettingsSessionFallback,
  formatBytes,
  formatCredits,
  formatRefillAt,
  KEYBOARD_SHORTCUT_GROUPS,
  SETTINGS_TABS,
  THEME_PREVIEW,
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
    expect(KEYBOARD_SHORTCUT_GROUPS).toEqual([
      {
        items: [
          { keys: ["Ctrl", "Shift", "P"], label: "Command Palette" },
          { keys: ["Ctrl", "4"], label: "Open Files" },
        ],
        name: "General",
      },
      {
        items: [
          { keys: ["Ctrl", "Shift", "N"], label: "Create Folder" },
          { keys: ["Ctrl", "U"], label: "Upload File" },
          { keys: ["Ctrl", "Shift", "U"], label: "Upload Folder" },
          { keys: ["Ctrl", "O"], label: "Open Selection" },
          { keys: ["Ctrl", "Shift", "M"], label: "Move Selection Up" },
        ],
        name: "Workspace",
      },
      {
        items: [
          { keys: ["Ctrl", "N"], label: "New Method" },
          { keys: ["Ctrl", "Shift", "O"], label: "New Note" },
          { keys: ["Ctrl", "Shift", "L"], label: "Import Link" },
        ],
        name: "Editing",
      },
    ]);
    expect(THEME_PREVIEW).toEqual({
      dark: {
        inner: "#e4e4e4eb",
        outer: "#141414",
      },
      light: {
        inner: "#141414f0",
        outer: "#fcfcfc",
      },
    });
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
