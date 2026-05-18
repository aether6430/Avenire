import { describe, expect, it } from "vitest";
import {
  createRemotePreferencesDefaults,
  createRemotePreferencesLoadFailureState,
  createRemotePreferencesLoadStartState,
  createRemotePreferencesLoadSuccessState,
  createRemotePreferencesSaveStartState,
  createRemotePreferencesSaveSuccessState,
  shouldLoadRemotePreferences,
} from "@/components/settings/settings-remote-preferences-runtime-model";

describe("settings remote preferences runtime model", () => {
  it("gates remote preference loading to the preferences and billing tabs", () => {
    expect(
      shouldLoadRemotePreferences({
        currentTab: "preferences",
        preferencesLoaded: false,
      })
    ).toBe(true);
    expect(
      shouldLoadRemotePreferences({
        currentTab: "billing",
        preferencesLoaded: false,
      })
    ).toBe(true);
    expect(
      shouldLoadRemotePreferences({
        currentTab: "account",
        preferencesLoaded: false,
      })
    ).toBe(false);
    expect(
      shouldLoadRemotePreferences({
        currentTab: "preferences",
        preferencesLoaded: true,
      })
    ).toBe(false);
  });

  it("creates deterministic load and save states from remote preference payloads", () => {
    const settings = {
      completedTasksAtTop: false,
      emailReceipts: false,
      onboardingCompleted: true,
      petAccessory: "glasses",
      petName: "Auri",
    } as const;

    expect(createRemotePreferencesDefaults()).toEqual({
      completedTasksAtTop: true,
      emailReceipts: true,
      petAccessory: "none",
      petName: "Auri",
    });
    expect(createRemotePreferencesLoadStartState()).toEqual({
      preferencesLoadFailed: false,
      preferencesLoading: true,
      preferencesStatus: "Loading preferences...",
    });
    expect(createRemotePreferencesLoadSuccessState(settings)).toEqual({
      completedTasksAtTop: false,
      emailReceipts: false,
      petAccessory: "glasses",
      petName: "Auri",
      preferencesLoadFailed: false,
      preferencesLoading: false,
      preferencesStatus: null,
    });
    expect(createRemotePreferencesLoadFailureState()).toEqual({
      preferencesLoadFailed: true,
      preferencesLoading: false,
      preferencesStatus: "Unable to load preferences.",
    });
    expect(createRemotePreferencesSaveStartState()).toEqual({
      preferencesStatus: "Saving preferences...",
    });
    expect(createRemotePreferencesSaveSuccessState(settings)).toEqual({
      completedTasksAtTop: false,
      emailReceipts: false,
      petAccessory: "glasses",
      petName: "Auri",
      preferencesStatus: "Preferences saved.",
    });
  });
});
