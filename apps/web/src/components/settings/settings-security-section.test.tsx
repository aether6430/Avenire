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

  it("renders active sudo, listed passkeys, session controls, and danger status", () => {
    const html = renderToStaticMarkup(
      <SettingsSecuritySection
        runtime={createRuntime({
          accountDeleteConfirm: "DELETE MY ACCOUNT",
          dangerStatus: "Verification required.",
          passkeys: [
            {
              deviceType: "MacBook Pro",
              id: "passkey-1",
              name: "Primary passkey",
            },
          ],
          passkeysStatus: "Passkey added.",
          sessionsStatus: "Other sessions revoked.",
          sudoActive: true,
          sudoStatus: "Verification active.",
        })}
      />
    );

    expect(html).toContain("Sensitive Actions");
    expect(html).toContain("Verified for this browser session.");
    expect(html).toContain("Active");
    expect(html).toContain("Verification Active");
    expect(html).toContain("Passkeys");
    expect(html).toContain("Primary passkey");
    expect(html).toContain("MacBook Pro");
    expect(html).toContain(">Remove<");
    expect(html).toContain("Passkey added.");
    expect(html).toContain("Sign Out Other Devices");
    expect(html).toContain("Other sessions revoked.");
    expect(html).toContain("Danger Zone");
    expect(html).toContain("DELETE MY ACCOUNT");
    expect(html).toContain("Verification required.");
  });

  it("keeps the explicit empty passkeys state when no passkeys exist", () => {
    const html = renderToStaticMarkup(
      <SettingsSecuritySection runtime={createRuntime()} />
    );

    expect(html).toContain("No passkeys registered.");
  });
});
