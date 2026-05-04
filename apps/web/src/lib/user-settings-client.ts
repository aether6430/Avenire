"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_PET_ACCESSORY,
  DEFAULT_PET_NAME,
  normalizePetAccessory,
  normalizePetName,
  type PetAccessory,
} from "@/lib/pet-preferences";

export interface UserSettingsPreferences {
  completedTasksAtTop: boolean;
  emailReceipts: boolean;
  onboardingCompleted: boolean;
  petAccessory: PetAccessory;
  petName: string;
}

interface UserSettingsSnapshot {
  loaded: boolean;
  settings: UserSettingsPreferences;
}

const DEFAULT_USER_SETTINGS: UserSettingsPreferences = {
  emailReceipts: true,
  completedTasksAtTop: true,
  onboardingCompleted: false,
  petName: DEFAULT_PET_NAME,
  petAccessory: DEFAULT_PET_ACCESSORY,
};

const USER_SETTINGS_UPDATED_EVENT = "avenire:user-settings-updated";

let snapshot: UserSettingsSnapshot = {
  loaded: false,
  settings: DEFAULT_USER_SETTINGS,
};

const listeners = new Set<() => void>();
let request: Promise<UserSettingsSnapshot> | null = null;
let requestRevision = 0;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function normalizeUserSettings(
  settings: Partial<UserSettingsPreferences> | null | undefined
): UserSettingsPreferences {
  return {
    emailReceipts:
      settings?.emailReceipts ?? DEFAULT_USER_SETTINGS.emailReceipts,
    completedTasksAtTop:
      settings?.completedTasksAtTop ??
      DEFAULT_USER_SETTINGS.completedTasksAtTop,
    onboardingCompleted:
      settings?.onboardingCompleted ??
      DEFAULT_USER_SETTINGS.onboardingCompleted,
    petName: normalizePetName(settings?.petName),
    petAccessory: normalizePetAccessory(settings?.petAccessory),
  };
}

function applySnapshot(settings: UserSettingsPreferences) {
  snapshot = {
    loaded: true,
    settings,
  };
  emit();
}

export function getUserSettingsSnapshot() {
  return snapshot;
}

export function subscribeToUserSettings(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function loadUserSettings(force = false) {
  if (snapshot.loaded && !force) {
    return snapshot.settings;
  }

  const revisionAtStart = requestRevision;

  if (request) {
    const result = await request;
    return requestRevision === revisionAtStart
      ? result.settings
      : snapshot.settings;
  }

  request = (async () => {
    const response = await fetch("/api/user-settings", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Unable to load preferences.");
    }

    const payload = (await response.json()) as {
      settings?: Partial<UserSettingsPreferences> | null;
    };
    const settings = normalizeUserSettings(payload.settings);
    if (requestRevision === revisionAtStart) {
      applySnapshot(settings);
    }
    window.dispatchEvent(new Event(USER_SETTINGS_UPDATED_EVENT));
    return snapshot;
  })().finally(() => {
    request = null;
  });

  const result = await request;
  return requestRevision === revisionAtStart
    ? result.settings
    : snapshot.settings;
}

export async function saveUserSettings(
  updates: Partial<UserSettingsPreferences>
) {
  requestRevision += 1;
  const response = await fetch("/api/user-settings", {
    body: JSON.stringify(updates),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

  if (!response.ok) {
    throw new Error("Unable to save preferences.");
  }

  const payload = (await response.json()) as {
    settings?: Partial<UserSettingsPreferences> | null;
  };
  const settings = normalizeUserSettings(payload.settings);
  applySnapshot(settings);
  window.dispatchEvent(new Event(USER_SETTINGS_UPDATED_EVENT));
  return settings;
}

export function useUserSettings() {
  const state = useSyncExternalStore(
    subscribeToUserSettings,
    getUserSettingsSnapshot,
    getUserSettingsSnapshot
  );

  useEffect(() => {
    void loadUserSettings().catch(() => undefined);
  }, []);

  return state;
}
