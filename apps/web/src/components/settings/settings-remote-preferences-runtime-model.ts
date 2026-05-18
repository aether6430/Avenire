import type { TabKey } from "@/components/settings/settings-panel-model";
import { DEFAULT_PET_NAME, type PetAccessory } from "@/lib/pet-preferences";
import type { UserSettingsPreferences } from "@/lib/user-settings-client";

export function shouldLoadRemotePreferences(input: {
  currentTab: TabKey;
  preferencesLoaded: boolean;
}) {
  return (
    (input.currentTab === "preferences" || input.currentTab === "billing") &&
    !input.preferencesLoaded
  );
}

export function createRemotePreferencesLoadStartState() {
  return {
    preferencesLoadFailed: false,
    preferencesLoading: true,
    preferencesStatus: "Loading preferences...",
  };
}

export function createRemotePreferencesLoadSuccessState(
  settings: UserSettingsPreferences
) {
  return {
    completedTasksAtTop: settings.completedTasksAtTop,
    emailReceipts: settings.emailReceipts,
    petAccessory: settings.petAccessory,
    petName: settings.petName,
    preferencesLoadFailed: false,
    preferencesLoading: false,
    preferencesStatus: null,
  };
}

export function createRemotePreferencesLoadFailureState() {
  return {
    preferencesLoadFailed: true,
    preferencesLoading: false,
    preferencesStatus: "Unable to load preferences.",
  };
}

export function createRemotePreferencesSaveStartState() {
  return {
    preferencesStatus: "Saving preferences...",
  };
}

export function createRemotePreferencesSaveSuccessState(
  settings: UserSettingsPreferences
) {
  return {
    completedTasksAtTop: settings.completedTasksAtTop,
    emailReceipts: settings.emailReceipts,
    petAccessory: settings.petAccessory,
    petName: settings.petName,
    preferencesStatus: "Preferences saved.",
  };
}

export function createRemotePreferencesDefaults() {
  return {
    completedTasksAtTop: true,
    emailReceipts: true,
    petAccessory: "none" as PetAccessory,
    petName: DEFAULT_PET_NAME,
  };
}
