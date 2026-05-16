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
});
