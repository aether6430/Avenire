"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TabKey } from "@/components/settings/settings-panel-model";
import { DEFAULT_PET_NAME, type PetAccessory } from "@/lib/pet-preferences";
import {
  loadUserSettings,
  saveUserSettings,
  type UserSettingsPreferences,
} from "@/lib/user-settings-client";

export function useSettingsPanelRemotePreferences({
  currentTab,
}: {
  currentTab: TabKey;
}) {
  const [preferencesLoadFailed, setPreferencesLoadFailed] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesStatus, setPreferencesStatus] = useState<string | null>(
    null
  );
  const [emailReceipts, setEmailReceipts] = useState(true);
  const [completedTasksAtTop, setCompletedTasksAtTop] = useState(true);
  const [petName, setPetName] = useState(DEFAULT_PET_NAME);
  const [petAccessory, setPetAccessory] = useState<PetAccessory>("none");
  const preferencesLoadedRef = useRef(false);

  const refreshUserSettings = useCallback(async () => {
    setPreferencesLoading(true);
    setPreferencesLoadFailed(false);
    setPreferencesStatus("Loading preferences...");
    try {
      const settings = await loadUserSettings();
      setEmailReceipts(settings.emailReceipts);
      setCompletedTasksAtTop(settings.completedTasksAtTop);
      setPetName(settings.petName);
      setPetAccessory(settings.petAccessory);
      setPreferencesLoadFailed(false);
      setPreferencesStatus(null);
    } catch {
      setPreferencesLoadFailed(true);
      setPreferencesStatus("Unable to load preferences.");
    } finally {
      setPreferencesLoading(false);
    }
  }, []);

  const persistUserSettings = async (
    updates: Partial<UserSettingsPreferences>,
    rollback: () => void
  ) => {
    try {
      setPreferencesStatus("Saving preferences...");
      const settings = await saveUserSettings(updates);
      setEmailReceipts(settings.emailReceipts);
      setCompletedTasksAtTop(settings.completedTasksAtTop);
      setPetName(settings.petName);
      setPetAccessory(settings.petAccessory);
      setPreferencesStatus("Preferences saved.");
    } catch {
      rollback();
      setPreferencesStatus("Unable to save preferences.");
    }
  };

  useEffect(() => {
    const shouldWarmPreferences =
      currentTab === "preferences" || currentTab === "billing";
    if (!(shouldWarmPreferences && !preferencesLoadedRef.current)) {
      return;
    }
    preferencesLoadedRef.current = true;
    void refreshUserSettings();
  }, [currentTab, refreshUserSettings]);

  return {
    completedTasksAtTop,
    emailReceipts,
    persistUserSettings,
    petAccessory,
    petName,
    preferencesLoadFailed,
    preferencesLoading,
    preferencesStatus,
    refreshUserSettings,
    setCompletedTasksAtTop,
    setEmailReceipts,
    setPetAccessory,
    setPetName,
  };
}
