"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  createAvatarUploadFinishState,
  createAvatarUploadMissingUrlState,
  createAvatarUploadSavedState,
  createAvatarUploadStartState,
  resolveAvatarFallbackInitials,
  resolveAvatarPreviewSource,
  resolveAvatarSeed,
  resolveDisplayAvatar,
  resolveUploadedAvatarUrl,
} from "@/components/settings/settings-avatar-runtime-model";
import { getUploadErrorMessage } from "@/lib/upload";
import { useUploadThing } from "@/lib/uploadthing";

interface SettingsSessionUser {
  email?: string | null;
  image?: string | null;
  name?: string | null;
}

export function useSettingsPanelAvatar({
  profileImage,
  profileName,
  saveProfile,
  sessionUser,
  setProfileImage,
  setProfileStatus,
}: {
  profileImage: string;
  profileName: string;
  saveProfile: (nextImage?: string) => Promise<boolean>;
  sessionUser?: SettingsSessionUser | null;
  setProfileImage: React.Dispatch<React.SetStateAction<string>>;
  setProfileStatus: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { startUpload: startAvatarUpload } = useUploadThing("imageUploader");

  useEffect(() => {
    setAvatarPreview(resolveAvatarPreviewSource(sessionUser));
  }, [sessionUser]);

  const handleAvatarFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const startState = createAvatarUploadStartState();
    setAvatarUploading(startState.avatarUploading);
    setIsUploadingAvatar(startState.isUploadingAvatar);
    setProfileStatus(startState.profileStatus);

    try {
      const uploaded = ((await startAvatarUpload([file])) ?? [])[0] as
        | { ufsUrl?: string | null; url?: string | null }
        | undefined;
      const uploadedUrl = resolveUploadedAvatarUrl(uploaded);

      if (!uploadedUrl) {
        setProfileStatus(createAvatarUploadMissingUrlState().profileStatus);
        return;
      }

      const savedState = createAvatarUploadSavedState(uploadedUrl);
      setProfileImage(savedState.profileImage);
      setAvatarPreview(savedState.avatarPreview);

      const saved = await saveProfile(uploadedUrl);
      if (saved) {
        setProfileStatus(savedState.profileStatus);
      }
    } catch (error) {
      setProfileStatus(getUploadErrorMessage(error));
    } finally {
      const finishState = createAvatarUploadFinishState();
      setAvatarUploading(finishState.avatarUploading);
      setIsUploadingAvatar(finishState.isUploadingAvatar);
    }
  };

  const displayAvatar = resolveDisplayAvatar({
    avatarPreview,
    profileImage,
    profileName,
    sessionUser,
  });
  const fallbackInitials = resolveAvatarFallbackInitials({
    profileName,
    sessionUser,
  });
  const avatarSeed = resolveAvatarSeed({
    profileName,
    sessionUser,
  });

  return {
    avatarSeed,
    avatarPreview,
    avatarUploading,
    displayAvatar,
    fallbackInitials,
    fileInputRef,
    handleAvatarFileChange,
    isUploadingAvatar,
  };
}
