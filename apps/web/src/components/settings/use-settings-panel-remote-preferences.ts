"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TabKey } from "@/components/settings/settings-panel-model";
import {
  createRemotePreferencesDefaults,
  createRemotePreferencesLoadFailureState,
  createRemotePreferencesLoadStartState,
  createRemotePreferencesLoadSuccessState,
  createRemotePreferencesSaveStartState,
  createRemotePreferencesSaveSuccessState,
  shouldLoadRemotePreferences,
} from "@/components/settings/settings-remote-preferences-runtime-model";
import type { PetAccessory } from "@/lib/pet-preferences";
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
  const [preferencesErrorMessage, setPreferencesErrorMessage] = useState<
    string | null
  >(null);
  const [preferencesStatus, setPreferencesStatus] = useState<string | null>(
    null
  );
  const defaults = createRemotePreferencesDefaults();
  const [emailReceipts, setEmailReceipts] = useState(defaults.emailReceipts);
  const [completedTasksAtTop, setCompletedTasksAtTop] = useState(
    defaults.completedTasksAtTop
  );
  const [petName, setPetName] = useState(defaults.petName);
  const [petAccessory, setPetAccessory] = useState<PetAccessory>(
    defaults.petAccessory
  );
  const preferencesLoadedRef = useRef(false);

  const refreshUserSettings = useCallback(async () => {
    const startState = createRemotePreferencesLoadStartState();
    setPreferencesErrorMessage(startState.preferencesErrorMessage);
    setPreferencesLoading(startState.preferencesLoading);
    setPreferencesLoadFailed(startState.preferencesLoadFailed);
    setPreferencesStatus(startState.preferencesStatus);
    try {
      const settings = await loadUserSettings();
      const successState = createRemotePreferencesLoadSuccessState(settings);
      setEmailReceipts(successState.emailReceipts);
      setCompletedTasksAtTop(successState.completedTasksAtTop);
      setPetName(successState.petName);
      setPetAccessory(successState.petAccessory);
      setPreferencesErrorMessage(successState.preferencesErrorMessage);
      setPreferencesLoadFailed(successState.preferencesLoadFailed);
      setPreferencesStatus(successState.preferencesStatus);
      setPreferencesLoading(successState.preferencesLoading);
    } catch (error) {
      const failureState = createRemotePreferencesLoadFailureState(
        error instanceof Error ? error.message : null
      );
      setPreferencesErrorMessage(failureState.preferencesErrorMessage);
      setPreferencesLoadFailed(failureState.preferencesLoadFailed);
      setPreferencesStatus(failureState.preferencesStatus);
      setPreferencesLoading(failureState.preferencesLoading);
    }
  }, []);

  const persistUserSettings = async (
    updates: Partial<UserSettingsPreferences>,
    rollback: () => void
  ) => {
    try {
      setPreferencesStatus(
        createRemotePreferencesSaveStartState().preferencesStatus
      );
      const settings = await saveUserSettings(updates);
      const successState = createRemotePreferencesSaveSuccessState(settings);
      setEmailReceipts(successState.emailReceipts);
      setCompletedTasksAtTop(successState.completedTasksAtTop);
      setPetName(successState.petName);
      setPetAccessory(successState.petAccessory);
      setPreferencesStatus(successState.preferencesStatus);
    } catch {
      rollback();
      setPreferencesStatus("Unable to save preferences.");
    }
  };

  useEffect(() => {
    if (
      !shouldLoadRemotePreferences({
        currentTab,
        preferencesLoaded: preferencesLoadedRef.current,
      })
    ) {
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
    preferencesErrorMessage,
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
