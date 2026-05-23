"use client";

import { updateUser } from "@avenire/auth/app-client";
import { useEffect, useState } from "react";
import {
  createProfileSaveFailureState,
  createProfileSaveStartState,
  resolveProfileSaveStatus,
  syncProfileDraftFromSession,
} from "@/components/settings/settings-account-runtime-model";

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
  const initialDraft = syncProfileDraftFromSession(sessionUser);
  const [profileName, setProfileName] = useState(initialDraft.profileName);
  const [profileImage, setProfileImage] = useState(initialDraft.profileImage);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    const next = syncProfileDraftFromSession(sessionUser);
    setProfileName(next.profileName);
    setProfileImage(next.profileImage);
  }, [sessionUser]);

  const saveProfile = async (nextImage?: string) => {
    const startState = createProfileSaveStartState();
    setIsSavingProfile(startState.isSavingProfile);
    setProfileStatus(startState.profileStatus);

    try {
      const result = await updateUser({
        name: profileName.trim() || undefined,
        image: (nextImage ?? profileImage).trim() || undefined,
      });
      setProfileStatus(resolveProfileSaveStatus(result));
      return !result.error;
    } catch {
      const failure = createProfileSaveFailureState();
      setProfileStatus(failure.profileStatus);
      return false;
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
