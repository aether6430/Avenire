import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  revokeOtherSessionsMock,
  settingsSecuritySectionMock,
  useSettingsPanelAccountDangerMock,
  useSettingsPanelPasskeysMock,
} = vi.hoisted(() => ({
  revokeOtherSessionsMock: vi.fn(),
  settingsSecuritySectionMock: vi.fn(() =>
    createElement("div", { "data-settings-security-section": "1" })
  ),
  useSettingsPanelAccountDangerMock: vi.fn(),
  useSettingsPanelPasskeysMock: vi.fn(),
}));

vi.mock("@avenire/auth/app-client", () => ({
  revokeOtherSessions: revokeOtherSessionsMock,
}));

vi.mock("@/components/settings/settings-security-section", () => ({
  SettingsSecuritySection: settingsSecuritySectionMock,
}));

vi.mock("@/components/settings/use-settings-panel-account-danger", () => ({
  useSettingsPanelAccountDanger: useSettingsPanelAccountDangerMock,
}));

vi.mock("@/components/settings/use-settings-panel-passkeys", () => ({
  useSettingsPanelPasskeys: useSettingsPanelPasskeysMock,
}));

import { SettingsSecurityTabShell } from "@/components/settings/settings-security-tab-shell";

describe("SettingsSecurityTabShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsPanelPasskeysMock.mockReturnValue({
      addPasskey: async () => {},
      passkeys: [{ id: "passkey-1" }],
      passkeysLoadFailed: false,
      passkeysLoading: false,
      passkeysStatus: "Passkey ready.",
      removePasskey: async () => {},
    });
    useSettingsPanelAccountDangerMock.mockReturnValue({
      accountDeleteConfirm: "",
      dangerStatus: "Danger ready.",
      deleteAccount: async () => {},
      setAccountDeleteConfirm: () => {},
    });
    revokeOtherSessionsMock.mockResolvedValue({ error: null });
  });

  it("wires passkey and account-danger runtime into the visible security section", () => {
    const html = renderToStaticMarkup(
      <SettingsSecurityTabShell
        currentTab="security"
        requestSudoForAction={() => {}}
        setSudoActive={() => {}}
        sudoActive
        sudoStatus="Verification active."
        verifySudoSession={async () => {}}
      />
    );

    expect(useSettingsPanelPasskeysMock).toHaveBeenCalledWith({
      currentTab: "security",
    });
    expect(useSettingsPanelAccountDangerMock).toHaveBeenCalledWith({
      requestSudoForAction: expect.any(Function),
      setSudoActive: expect.any(Function),
      sudoActive: true,
    });
    expect(settingsSecuritySectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: expect.objectContaining({
          dangerStatus: "Danger ready.",
          passkeys: [{ id: "passkey-1" }],
          passkeysStatus: "Passkey ready.",
          sessionsStatus: null,
          sudoActive: true,
          sudoStatus: "Verification active.",
        }),
      }),
      undefined
    );
    expect(html).toContain('data-settings-security-section="1"');
  });
});
