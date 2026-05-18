import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { settingsShortcutsSectionMock, useSettingsPanelShortcutsMock } =
  vi.hoisted(() => ({
    settingsShortcutsSectionMock: vi.fn(() =>
      createElement("div", { "data-settings-shortcuts-section": "1" })
    ),
    useSettingsPanelShortcutsMock: vi.fn(),
  }));

vi.mock("@/components/settings/settings-misc-sections", () => ({
  SettingsShortcutsSection: settingsShortcutsSectionMock,
}));

vi.mock("@/components/settings/use-settings-panel-shortcuts", () => ({
  useSettingsPanelShortcuts: useSettingsPanelShortcutsMock,
}));

import { SettingsShortcutsTabShell } from "@/components/settings/settings-shortcuts-tab-shell";

describe("SettingsShortcutsTabShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsPanelShortcutsMock.mockReturnValue({
      filteredShortcutCount: 2,
      filteredShortcutGroups: [],
      setShortcutQuery: () => {},
      shortcutQuery: "",
    });
  });

  it("routes shortcut runtime through the shared shortcuts surface", () => {
    const html = renderToStaticMarkup(<SettingsShortcutsTabShell />);

    expect(settingsShortcutsSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filteredShortcutCount: 2,
        shortcutQuery: "",
      }),
      undefined
    );
    expect(html).toContain('data-settings-shortcuts-section="1"');
  });
});
