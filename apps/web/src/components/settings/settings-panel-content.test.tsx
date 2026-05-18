import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsPanelContent } from "@/components/settings/settings-panel-content";
import type { SettingsPanelRuntime } from "@/components/settings/use-settings-panel";

const {
  settingsPanelShellMock,
  settingsAccountSectionMock,
  settingsBillingSectionMock,
  settingsDataSectionMock,
  settingsPreferencesSectionMock,
  settingsSecuritySectionMock,
  settingsShortcutsSectionMock,
  settingsWorkspaceSectionMock,
} = vi.hoisted(() => ({
  settingsAccountSectionMock: vi.fn(() =>
    createElement("div", { "data-settings-account": "1" })
  ),
  settingsBillingSectionMock: vi.fn(() =>
    createElement("div", { "data-settings-billing": "1" })
  ),
  settingsDataSectionMock: vi.fn(() =>
    createElement("div", { "data-settings-data": "1" })
  ),
  settingsPanelShellMock: vi.fn(({ children }: { children: ReactNode }) =>
    createElement("div", { "data-settings-shell": "1" }, children)
  ),
  settingsPreferencesSectionMock: vi.fn(() =>
    createElement("div", { "data-settings-preferences": "1" })
  ),
  settingsSecuritySectionMock: vi.fn(() =>
    createElement("div", { "data-settings-security": "1" })
  ),
  settingsShortcutsSectionMock: vi.fn(() =>
    createElement("div", { "data-settings-shortcuts": "1" })
  ),
  settingsWorkspaceSectionMock: vi.fn(() =>
    createElement("div", { "data-settings-workspace": "1" })
  ),
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => unknown) => {
    const source = String(loader);
    if (source.includes("settings-account-section")) {
      return settingsAccountSectionMock;
    }
    if (source.includes("settings-billing-section")) {
      return settingsBillingSectionMock;
    }
    if (source.includes("settings-misc-sections")) {
      return settingsDataSectionMock;
    }
    if (source.includes("settings-shortcuts-tab-shell")) {
      return settingsShortcutsSectionMock;
    }
    if (source.includes("settings-preferences-section")) {
      return settingsPreferencesSectionMock;
    }
    if (source.includes("settings-security-tab-shell")) {
      return settingsSecuritySectionMock;
    }
    if (source.includes("settings-workspace-tab-shell")) {
      return settingsWorkspaceSectionMock;
    }
    throw new Error(`Unexpected dynamic import: ${source}`);
  },
}));

vi.mock("@/components/settings/settings-panel-shell", () => ({
  SettingsPanelShell: settingsPanelShellMock,
}));

function createRuntime(
  overrides: Partial<SettingsPanelRuntime> = {}
): SettingsPanelRuntime {
  return {
    currentTab: "account",
    currentUserEmail: "owner@example.com",
    hasKeyboardDetected: true,
    mobileTabs: [],
    privacyMode: false,
    refreshSudoStatus: async () => {},
    requestSudoForAction: async () => {},
    session: null,
    setSudoActive: () => {},
    setTab: () => {},
    sudoActive: false,
    sudoStatus: null,
    verifySudoSession: async () => {},
    ...overrides,
  } as unknown as SettingsPanelRuntime;
}

describe("SettingsPanelContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes current tabs through the local settings section owners", () => {
    const initialWorkspaces = [
      {
        name: "Aveniri",
        organizationId: "org-1",
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    ];

    const cases = [
      {
        key: "account",
        marker: 'data-settings-account="1"',
      },
      {
        key: "billing",
        marker: 'data-settings-billing="1"',
      },
      {
        key: "preferences",
        marker: 'data-settings-preferences="1"',
      },
      {
        key: "data",
        marker: 'data-settings-data="1"',
      },
      {
        key: "shortcuts",
        marker: 'data-settings-shortcuts="1"',
      },
    ] as const;

    for (const testCase of cases) {
      const html = renderToStaticMarkup(
        <SettingsPanelContent
          initialWorkspaceId="workspace-1"
          initialWorkspaces={initialWorkspaces}
          runtime={createRuntime({
            currentTab: testCase.key,
          })}
        />
      );

      expect(html).toContain('data-settings-shell="1"');
      expect(html).toContain(testCase.marker);
    }
  });

  it("passes security and workspace-specific runtime props into their shells", () => {
    renderToStaticMarkup(
      <SettingsPanelContent
        initialWorkspaceId="workspace-1"
        initialWorkspaces={[
          {
            name: "Aveniri",
            organizationId: "org-1",
            rootFolderId: "root-1",
            workspaceId: "workspace-1",
          },
        ]}
        runtime={createRuntime({
          currentTab: "security",
          requestSudoForAction: async () => {},
          setSudoActive: () => {},
          sudoActive: true,
          sudoStatus: "Verification active.",
          verifySudoSession: async () => {},
        })}
      />
    );

    expect(settingsSecuritySectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currentTab: "security",
        sudoActive: true,
        sudoStatus: "Verification active.",
      }),
      undefined
    );

    renderToStaticMarkup(
      <SettingsPanelContent
        initialWorkspaceId="workspace-1"
        initialWorkspaces={[
          {
            name: "Aveniri",
            organizationId: "org-1",
            rootFolderId: "root-1",
            workspaceId: "workspace-1",
          },
        ]}
        runtime={createRuntime({
          currentTab: "workspace",
          currentUserEmail: "owner@example.com",
          privacyMode: true,
          refreshSudoStatus: async () => {},
          requestSudoForAction: async () => {},
          session: { user: { id: "user-1" } } as never,
        })}
      />
    );

    expect(settingsWorkspaceSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currentTab: "workspace",
        currentUserEmail: "owner@example.com",
        initialWorkspaceId: "workspace-1",
        privacyMode: true,
      }),
      undefined
    );
  });
});
