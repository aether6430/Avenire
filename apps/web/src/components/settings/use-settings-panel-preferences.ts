"use client";

import { useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import type { TabKey } from "@/components/settings/settings-panel-model";
import { useSettingsPanelRemotePreferences } from "@/components/settings/use-settings-panel-remote-preferences";
import {
  CHAT_COMPOSER_SEND_MODE_STORAGE_KEY,
  type ChatComposerSendMode,
  DEFAULT_CHAT_COMPOSER_SEND_MODE,
} from "@/lib/chat-composer-preferences";
import { PRIVACY_MODE_STORAGE_KEY } from "@/lib/privacy-mode";

export function useSettingsPanelPreferences({
  currentTab,
}: {
  currentTab: TabKey;
}) {
  const [privacyMode, setPrivacyMode] = useState(false);
  const [chatComposerSendMode, setChatComposerSendMode] =
    useLocalStorage<ChatComposerSendMode>(
      CHAT_COMPOSER_SEND_MODE_STORAGE_KEY,
      DEFAULT_CHAT_COMPOSER_SEND_MODE
    );
  const remotePreferences = useSettingsPanelRemotePreferences({ currentTab });
  const {
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
  } = remotePreferences;

  useEffect(() => {
    const stored = window.localStorage.getItem(PRIVACY_MODE_STORAGE_KEY);
    setPrivacyMode(stored === "1");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      PRIVACY_MODE_STORAGE_KEY,
      privacyMode ? "1" : "0"
    );
  }, [privacyMode]);

  return {
    chatComposerSendMode,
    completedTasksAtTop,
    emailReceipts,
    persistUserSettings,
    preferencesErrorMessage,
    preferencesLoadFailed,
    preferencesLoading,
    preferencesStatus,
    privacyMode,
    refreshUserSettings,
    setChatComposerSendMode,
    setCompletedTasksAtTop,
    setEmailReceipts,
    setPetAccessory,
    setPetName,
    setPrivacyMode,
    petAccessory,
    petName,
  };
}
