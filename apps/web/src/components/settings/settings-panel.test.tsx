import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  settingsPanelContentMock,
  settingsPanelDialogsMock,
  useSettingsPanelMock,
} = vi.hoisted(() => ({
  settingsPanelContentMock: vi.fn(() =>
    createElement("div", { "data-settings-content": "1" })
  ),
  settingsPanelDialogsMock: vi.fn(() =>
    createElement("div", { "data-settings-dialogs": "1" })
  ),
  useSettingsPanelMock: vi.fn(),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("@/components/settings/settings-panel-content", () => ({
  SettingsPanelContent: settingsPanelContentMock,
}));

vi.mock("@/components/settings/settings-panel-dialogs", () => ({
  SettingsPanelDialogs: settingsPanelDialogsMock,
}));

vi.mock("@/components/settings/use-settings-panel", () => ({
  useSettingsPanel: useSettingsPanelMock,
}));

import { SettingsPanel } from "@/components/settings/settings-panel";

describe("SettingsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsPanelMock.mockReturnValue({
      currentTab: "billing",
    });
  });

  it("composes settings content and dialogs from the shared panel runtime", () => {
    const workspaces = [
      {
        name: "Aveniri",
        organizationId: "org-1",
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    ];
    const html = renderToStaticMarkup(
      <SettingsPanel
        initialTab="billing"
        initialWorkspaceId="workspace-1"
        initialWorkspaces={workspaces}
      />
    );

    expect(useSettingsPanelMock).toHaveBeenCalledWith({
      initialTab: "billing",
      initialWorkspaceId: "workspace-1",
      initialWorkspaces: workspaces,
    });
    expect(settingsPanelContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        initialWorkspaceId: "workspace-1",
        initialWorkspaces: workspaces,
        runtime: { currentTab: "billing" },
      }),
      undefined
    );
    expect(settingsPanelDialogsMock).toHaveBeenCalledWith(
      { runtime: { currentTab: "billing" } },
      undefined
    );
    expect(html).toContain('data-settings-content="1"');
    expect(html).toContain('data-settings-dialogs="1"');
  });
});
