import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsAccountSection } from "@/components/settings/settings-account-section";
import type { SettingsPanelRuntime } from "@/components/settings/use-settings-panel";

function createRuntime(
  overrides: Partial<SettingsPanelRuntime> = {}
): SettingsPanelRuntime {
  return {
    accounts: [],
    accountsLoadFailed: false,
    accountsLoading: false,
    accountsStatus: null,
    avatarPreview: "",
    avatarUploading: false,
    displayAvatar: "",
    fallbackInitials: "AU",
    fileInputRef: { current: null },
    handleAvatarFileChange: async () => {},
    isSavingProfile: false,
    isUploadingAvatar: false,
    linkAccountProvider: async () => {},
    privacyMode: false,
    profileName: "Auri",
    profileStatus: null,
    saveProfile: async () => true,
    setProfileName: () => {},
    unlinkProviderAccount: async () => {},
    ...overrides,
  } as unknown as SettingsPanelRuntime;
}

describe("SettingsAccountSection", () => {
  it("renders an explicit loading state while linked accounts are still resolving", () => {
    const html = renderToStaticMarkup(
      <SettingsAccountSection
        runtime={createRuntime({ accountsLoading: true })}
      />
    );

    expect(html).toContain("Loading linked accounts...");
    expect(html).not.toContain("No linked accounts yet.");
  });

  it("renders an explicit failure state when linked accounts cannot be loaded", () => {
    const html = renderToStaticMarkup(
      <SettingsAccountSection
        runtime={createRuntime({ accountsLoadFailed: true })}
      />
    );

    expect(html).toContain("Unable to load linked accounts.");
    expect(html).not.toContain("No linked accounts yet.");
  });

  it("renders profile controls and connected provider actions for loaded accounts", () => {
    const html = renderToStaticMarkup(
      <SettingsAccountSection
        runtime={createRuntime({
          accounts: [
            {
              accountId: "github-user",
              id: "account-1",
              providerId: "github",
            },
          ],
          accountsStatus: "GitHub linked.",
          avatarUploading: true,
          displayAvatar: "https://cdn.avenire.app/avatar.png",
          profileStatus: "Profile saved.",
        })}
      />
    );

    expect(html).toContain("Profile");
    expect(html).toContain("Display Name");
    expect(html).toContain("Profile photo");
    expect(html).toContain(">AU<");
    expect(html).toContain("Uploading...");
    expect(html).toContain("Save Changes");
    expect(html).toContain("Profile saved.");
    expect(html).toContain("Connected Providers");
    expect(html).toContain("Connect Google");
    expect(html).toContain("Connect GitHub");
    expect(html).toContain("github");
    expect(html).toContain("github-user");
    expect(html).toContain("GitHub linked.");
  });

  it("keeps the explicit empty state when no linked accounts exist", () => {
    const html = renderToStaticMarkup(
      <SettingsAccountSection runtime={createRuntime()} />
    );

    expect(html).toContain("No linked accounts yet.");
  });
});
