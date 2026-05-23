"use client";

import type { TabKey } from "@/components/settings/settings-panel-model";
import { useSettingsPanelAvatar } from "@/components/settings/use-settings-panel-avatar";
import { useSettingsPanelLinkedAccounts } from "@/components/settings/use-settings-panel-linked-accounts";
import { useSettingsPanelProfile } from "@/components/settings/use-settings-panel-profile";

interface SettingsSessionUser {
  email?: string | null;
  image?: string | null;
  name?: string | null;
}

export function useSettingsPanelAccount({
  currentTab,
  sessionUser,
}: {
  currentTab: TabKey;
  sessionUser?: SettingsSessionUser | null;
}) {
  const profile = useSettingsPanelProfile({ sessionUser });
  const {
    isSavingProfile,
    profileImage,
    profileName,
    profileStatus,
    saveProfile,
    setProfileImage,
    setProfileName,
    setProfileStatus,
  } = profile;
  const linkedAccounts = useSettingsPanelLinkedAccounts({ currentTab });
  const {
    accounts,
    accountsErrorMessage,
    accountsLoadFailed,
    accountsLoading,
    accountsStatus,
    linkAccountProvider,
    refreshAccounts,
    setAccountsStatus,
    unlinkProviderAccount,
  } = linkedAccounts;
  const avatar = useSettingsPanelAvatar({
    profileImage,
    profileName,
    saveProfile,
    sessionUser,
    setProfileImage,
    setProfileStatus,
  });

  return {
    accounts,
    accountsErrorMessage,
    accountsLoadFailed,
    accountsLoading,
    accountsStatus,
    avatarSeed: avatar.avatarSeed,
    avatarPreview: avatar.avatarPreview,
    avatarUploading: avatar.avatarUploading,
    displayAvatar: avatar.displayAvatar,
    fallbackInitials: avatar.fallbackInitials,
    fileInputRef: avatar.fileInputRef,
    handleAvatarFileChange: avatar.handleAvatarFileChange,
    isSavingProfile,
    isUploadingAvatar: avatar.isUploadingAvatar,
    linkAccountProvider,
    profileName,
    profileStatus,
    refreshAccounts,
    saveProfile,
    setAccountsStatus,
    setProfileName,
    unlinkProviderAccount,
  };
}
