import {
  SETTINGS_TABS,
  type TabKey,
} from "@/components/settings/settings-panel-model";

export function shouldSyncSettingsLocalTab(input: {
  initialTab: TabKey;
  localTab: TabKey;
}) {
  return input.localTab !== input.initialTab;
}

export function resolveVisibleSettingsTabs(hasKeyboardDetected: boolean) {
  return SETTINGS_TABS.filter(
    (tab) => tab.key !== "shortcuts" || hasKeyboardDetected
  );
}

export function resolveMobileSettingsTabs(
  visibleTabs: ReturnType<typeof resolveVisibleSettingsTabs>
) {
  return visibleTabs.filter(
    (tab) => !("mobileHidden" in tab && tab.mobileHidden)
  );
}
