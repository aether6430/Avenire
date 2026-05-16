"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { getFacehashUrl } from "@/lib/avatar";
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
    const src =
      sessionUser?.image ??
      getFacehashUrl(sessionUser?.name ?? sessionUser?.email ?? "");
    setAvatarPreview(src);
  }, [sessionUser?.email, sessionUser?.image, sessionUser?.name]);

  const handleAvatarFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setAvatarUploading(true);
    setIsUploadingAvatar(true);
    setProfileStatus("Uploading avatar...");

    try {
      const uploaded = ((await startAvatarUpload([file])) ?? [])[0] as
        | { ufsUrl?: string | null; url?: string | null }
        | undefined;
      const uploadedUrl = uploaded?.ufsUrl ?? uploaded?.url ?? null;

      if (!uploadedUrl) {
        setProfileStatus("Unable to upload avatar.");
        return;
      }

      setProfileImage(uploadedUrl);
      setAvatarPreview(uploadedUrl);

      const saved = await saveProfile(uploadedUrl);
      if (saved) {
        setProfileStatus("Avatar uploaded and saved.");
      }
    } catch (error) {
      setProfileStatus(getUploadErrorMessage(error));
    } finally {
      setAvatarUploading(false);
      setIsUploadingAvatar(false);
    }
  };

  const displayAvatar =
    avatarPreview ||
    profileImage ||
    getFacehashUrl(profileName || sessionUser?.email || "");
  const fallbackInitials = (profileName || sessionUser?.name || "U")
    .slice(0, 2)
    .toUpperCase();

  return {
    avatarPreview,
    avatarUploading,
    displayAvatar,
    fallbackInitials,
    fileInputRef,
    handleAvatarFileChange,
    isUploadingAvatar,
  };
}
