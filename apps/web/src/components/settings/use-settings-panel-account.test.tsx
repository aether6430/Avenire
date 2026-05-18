import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  useSettingsPanelAvatarMock,
  useSettingsPanelLinkedAccountsMock,
  useSettingsPanelProfileMock,
} = vi.hoisted(() => ({
  useSettingsPanelAvatarMock: vi.fn(),
  useSettingsPanelLinkedAccountsMock: vi.fn(),
  useSettingsPanelProfileMock: vi.fn(),
}));

vi.mock("@/components/settings/use-settings-panel-avatar", () => ({
  useSettingsPanelAvatar: useSettingsPanelAvatarMock,
}));

vi.mock("@/components/settings/use-settings-panel-linked-accounts", () => ({
  useSettingsPanelLinkedAccounts: useSettingsPanelLinkedAccountsMock,
}));

vi.mock("@/components/settings/use-settings-panel-profile", () => ({
  useSettingsPanelProfile: useSettingsPanelProfileMock,
}));

import { useSettingsPanelAccount } from "@/components/settings/use-settings-panel-account";

type HookValue = ReturnType<typeof useSettingsPanelAccount>;

function renderHookValue(
  options: Parameters<typeof useSettingsPanelAccount>[0]
): HookValue {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useSettingsPanelAccount(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useSettingsPanelAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsPanelProfileMock.mockReturnValue({
      isSavingProfile: false,
      profileImage: "https://cdn.avenire.app/profile.png",
      profileName: "Owner",
      profileStatus: "Profile updated.",
      saveProfile: async () => true,
      setProfileImage: () => {},
      setProfileName: () => {},
      setProfileStatus: () => {},
    });
    useSettingsPanelLinkedAccountsMock.mockReturnValue({
      accounts: [
        { accountId: "github-user", id: "account-1", providerId: "github" },
      ],
      accountsLoadFailed: false,
      accountsLoading: false,
      accountsStatus: "GitHub linked.",
      linkAccountProvider: async () => {},
      refreshAccounts: async () => {},
      setAccountsStatus: () => {},
      unlinkProviderAccount: async () => {},
    });
    useSettingsPanelAvatarMock.mockReturnValue({
      avatarPreview: "https://cdn.avenire.app/preview.png",
      avatarUploading: false,
      displayAvatar: "https://cdn.avenire.app/display.png",
      fallbackInitials: "OW",
      fileInputRef: { current: null },
      handleAvatarFileChange: async () => {},
      isUploadingAvatar: false,
    });
  });

  it("composes profile, linked-account, and avatar runtime into one account surface", () => {
    const sessionUser = {
      email: "owner@example.com",
      image: "https://cdn.avenire.app/session.png",
      name: "Owner",
    };

    const hook = renderHookValue({
      currentTab: "account",
      sessionUser,
    });

    expect(useSettingsPanelProfileMock).toHaveBeenCalledWith({ sessionUser });
    expect(useSettingsPanelLinkedAccountsMock).toHaveBeenCalledWith({
      currentTab: "account",
    });
    expect(useSettingsPanelAvatarMock).toHaveBeenCalledWith({
      profileImage: "https://cdn.avenire.app/profile.png",
      profileName: "Owner",
      saveProfile: expect.any(Function),
      sessionUser,
      setProfileImage: expect.any(Function),
      setProfileStatus: expect.any(Function),
    });

    expect(hook).toMatchObject({
      accounts: [
        { accountId: "github-user", id: "account-1", providerId: "github" },
      ],
      accountsLoadFailed: false,
      accountsLoading: false,
      accountsStatus: "GitHub linked.",
      avatarPreview: "https://cdn.avenire.app/preview.png",
      avatarUploading: false,
      displayAvatar: "https://cdn.avenire.app/display.png",
      fallbackInitials: "OW",
      isSavingProfile: false,
      isUploadingAvatar: false,
      profileName: "Owner",
      profileStatus: "Profile updated.",
    });
  });
});
