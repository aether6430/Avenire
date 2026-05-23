import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
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
    passkeysErrorMessage: null,
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

const settingsPanelContentFile = resolve(
  import.meta.dirname,
  "./settings-panel-content.tsx"
);
const passkeysHookFile = resolve(
  import.meta.dirname,
  "./use-settings-panel-passkeys.ts"
);
const removedWrapperFile = resolve(
  import.meta.dirname,
  "./settings-security-tab-shell.tsx"
);

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
        runtime={createRuntime({
          passkeysErrorMessage: "passkeys backend offline",
          passkeysLoadFailed: true,
        })}
      />
    );

    expect(html).toContain("passkeys backend offline");
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

  it("keeps security composition in settings-panel-content without the old tab-shell wrapper file", () => {
    const settingsPanelContentSource = readFileSync(
      settingsPanelContentFile,
      "utf8"
    );
    const passkeysHookSource = readFileSync(passkeysHookFile, "utf8");

    expect(settingsPanelContentSource).toContain(
      'from "@/components/settings/settings-security-section"'
    );
    expect(settingsPanelContentSource).toContain(
      'from "@/components/settings/use-settings-panel-account-danger"'
    );
    expect(settingsPanelContentSource).toContain(
      'from "@/components/settings/use-settings-panel-passkeys"'
    );
    expect(settingsPanelContentSource).toContain(
      "function ReadySettingsSecuritySection"
    );
    expect(settingsPanelContentSource).not.toContain(
      'from "@/components/settings/settings-security-tab-shell"'
    );
    expect(passkeysHookSource).toContain("response = await fetch");
    expect(passkeysHookSource).toContain("resolveRemovePasskeyStatus({");
    expect(passkeysHookSource).toContain("error: payload.error");
    expect(passkeysHookSource).not.toContain(
      "setPasskeysStatus(resolveRemovePasskeyStatus(response.ok))"
    );
    expect(existsSync(removedWrapperFile)).toBe(false);
  });
});
