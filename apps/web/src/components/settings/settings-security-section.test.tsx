import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsSecuritySection } from "@/components/settings/settings-security-section";
import type { SettingsPanelRuntime } from "@/components/settings/use-settings-panel";

function createRuntime(
  overrides: Partial<SettingsPanelRuntime> = {}
): SettingsPanelRuntime {
  return {
    accountDeleteConfirm: "",
    addPasskey: async () => {},
    dangerStatus: null,
    deleteAccount: async () => {},
    passkeys: [],
    passkeysLoadFailed: false,
    passkeysLoading: false,
    passkeysStatus: null,
    removePasskey: async () => {},
    revokeOtherDeviceSessions: async () => {},
    sessionsStatus: null,
    setAccountDeleteConfirm: () => {},
    sudoActive: false,
    sudoStatus: null,
    verifySudoSession: async () => {},
    ...overrides,
  } as unknown as SettingsPanelRuntime;
}

describe("SettingsSecuritySection", () => {
  it("renders an explicit loading state while passkeys are still resolving", () => {
    const html = renderToStaticMarkup(
      <SettingsSecuritySection
        runtime={createRuntime({ passkeysLoading: true })}
      />
    );

    expect(html).toContain("Loading passkeys...");
    expect(html).not.toContain("No passkeys registered.");
  });

  it("renders an explicit failure state when passkeys cannot be loaded", () => {
    const html = renderToStaticMarkup(
      <SettingsSecuritySection
        runtime={createRuntime({ passkeysLoadFailed: true })}
      />
    );

    expect(html).toContain("Unable to load passkeys.");
    expect(html).not.toContain("No passkeys registered.");
  });
});
