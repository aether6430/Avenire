"use client";

import { SettingsShortcutsSection } from "@/components/settings/settings-misc-sections";
import { useSettingsPanelShortcuts } from "@/components/settings/use-settings-panel-shortcuts";

export function SettingsShortcutsTabShell() {
  const runtime = useSettingsPanelShortcuts();

  return <SettingsShortcutsSection {...runtime} />;
}
