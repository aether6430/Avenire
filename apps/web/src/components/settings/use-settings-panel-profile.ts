"use client";

import { updateUser } from "@avenire/auth/app-client";
import { useEffect, useState } from "react";

interface SettingsSessionUser {
  email?: string | null;
  image?: string | null;
  name?: string | null;
}

export function useSettingsPanelProfile({
  sessionUser,
}: {
  sessionUser?: SettingsSessionUser | null;
}) {
  const [profileName, setProfileName] = useState(sessionUser?.name ?? "");
  const [profileImage, setProfileImage] = useState(sessionUser?.image ?? "");
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    setProfileName(sessionUser?.name ?? "");
    setProfileImage(sessionUser?.image ?? "");
  }, [sessionUser?.image, sessionUser?.name]);

  const saveProfile = async (nextImage?: string) => {
    setIsSavingProfile(true);
    setProfileStatus("Saving...");

    try {
      const result = await updateUser({
        name: profileName.trim() || undefined,
        image: (nextImage ?? profileImage).trim() || undefined,
      });
      setProfileStatus(
        result.error ? "Unable to update profile." : "Profile updated."
      );
      return !result.error;
    } finally {
      setIsSavingProfile(false);
    }
  };

  return {
    isSavingProfile,
    profileImage,
    profileName,
    profileStatus,
    saveProfile,
    setProfileImage,
    setProfileName,
    setProfileStatus,
  };
}
