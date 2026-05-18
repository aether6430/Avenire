import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  settingsWorkspaceDialogsMock,
  settingsWorkspaceSectionMock,
  useSettingsPanelWorkspaceMock,
} = vi.hoisted(() => ({
  settingsWorkspaceDialogsMock: vi.fn(() =>
    createElement("div", { "data-settings-workspace-dialogs": "1" })
  ),
  settingsWorkspaceSectionMock: vi.fn(() =>
    createElement("div", { "data-settings-workspace-section": "1" })
  ),
  useSettingsPanelWorkspaceMock: vi.fn(),
}));

vi.mock("next/dynamic", () => ({
  default: () => settingsWorkspaceDialogsMock,
}));

vi.mock("@/components/settings/settings-workspace-section", () => ({
  SettingsWorkspaceSection: settingsWorkspaceSectionMock,
}));

vi.mock("@/components/settings/use-settings-panel-workspace", () => ({
  useSettingsPanelWorkspace: useSettingsPanelWorkspaceMock,
}));

import { SettingsWorkspaceTabShell } from "@/components/settings/settings-workspace-tab-shell";

describe("SettingsWorkspaceTabShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsPanelWorkspaceMock.mockReturnValue({
      activeWorkspaceId: "workspace-1",
      noteTemplates: [],
      selectedWorkspace: {
        name: "Aveniri",
        workspaceId: "workspace-1",
      },
      setNoteTemplates: () => {},
    });
  });

  it("passes workspace runtime through to the visible section and keeps dialogs closed by default", () => {
    const html = renderToStaticMarkup(
      <SettingsWorkspaceTabShell
        currentTab="workspace"
        currentUserEmail="owner@example.com"
        initialWorkspaceId="workspace-1"
        initialWorkspaces={[
          {
            name: "Aveniri",
            organizationId: "org-1",
            rootFolderId: "root-1",
            workspaceId: "workspace-1",
          },
        ]}
        privacyMode
        refreshSudoStatus={async () => {}}
        requestSudoForAction={() => {}}
        session={{ user: { email: "owner@example.com" } }}
      />
    );

    expect(useSettingsPanelWorkspaceMock).toHaveBeenCalledWith({
      currentTab: "workspace",
      initialWorkspaceId: "workspace-1",
      initialWorkspaces: [
        {
          name: "Aveniri",
          organizationId: "org-1",
          rootFolderId: "root-1",
          workspaceId: "workspace-1",
        },
      ],
      refreshSudoStatus: expect.any(Function),
      requestSudoForAction: expect.any(Function),
    });
    expect(settingsWorkspaceSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: expect.objectContaining({
          activeWorkspaceId: "workspace-1",
          currentUserEmail: "owner@example.com",
          openNoteTemplateEditor: expect.any(Function),
          privacyMode: true,
        }),
      }),
      undefined
    );
    expect(settingsWorkspaceDialogsMock).not.toHaveBeenCalled();
    expect(html).toContain('data-settings-workspace-section="1"');
    expect(html).not.toContain('data-settings-workspace-dialogs="1"');
  });
});
