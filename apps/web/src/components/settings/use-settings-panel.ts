"use client";

import { useSession } from "@avenire/auth/app-client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import type {
  TabKey,
  WorkspaceSummary,
} from "@/components/settings/settings-panel-model";
import {
  formatBytes,
  formatCredits,
  formatRefillAt,
  KEYBOARD_SHORTCUT_GROUPS,
  THEME_PREVIEW,
} from "@/components/settings/settings-panel-model";
import { useSettingsPanelAccount } from "@/components/settings/use-settings-panel-account";
import { useSettingsPanelBilling } from "@/components/settings/use-settings-panel-billing";
import { useSettingsPanelKeyboard } from "@/components/settings/use-settings-panel-keyboard";
import { useSettingsPanelNavigation } from "@/components/settings/use-settings-panel-navigation";
import { useSettingsPanelPreferences } from "@/components/settings/use-settings-panel-preferences";
import { useSettingsPanelSudo } from "@/components/settings/use-settings-panel-sudo";

export {
  KEYBOARD_SHORTCUT_GROUPS,
  THEME_PREVIEW,
  formatBytes,
  formatCredits,
  formatRefillAt,
};
export type {
  AccountEntry,
  BillingUsage,
  PasskeyEntry,
  TabKey,
  WorkspaceMember,
  WorkspaceSummary,
  WorkspaceUsage,
} from "@/components/settings/settings-panel-model";

export function useSettingsPanel({
  initialWorkspaces,
  initialWorkspaceId,
  initialTab = "account",
}: {
  initialWorkspaces?: WorkspaceSummary[];
  initialWorkspaceId?: string;
  initialTab?: TabKey;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const keyboardRuntime = useSettingsPanelKeyboard();
  const navigationRuntime = useSettingsPanelNavigation({
    hasKeyboardDetected: keyboardRuntime.hasKeyboardDetected,
    initialTab,
    pathname,
    router,
    searchParams,
  });
  const currentTab = navigationRuntime.currentTab;
  const preferencesRuntime = useSettingsPanelPreferences({ currentTab });
  const billingRuntime = useSettingsPanelBilling({
    currentTab,
    pathname,
    router,
    searchParams,
  });

  const accountRuntime = useSettingsPanelAccount({
    currentTab,
    sessionUser: session?.user,
  });
  const sudoRuntime = useSettingsPanelSudo({ currentTab });
  const currentUserEmail = session?.user?.email?.toLowerCase() ?? null;

  return {
    ...accountRuntime,
    ...billingRuntime,
    ...keyboardRuntime,
    ...navigationRuntime,
    ...preferencesRuntime,
    ...sudoRuntime,
    currentTab,
    currentUserEmail,
    router,
    searchParams,
    session,
    setTheme,
    theme,
  };
}

export type SettingsPanelRuntime = ReturnType<typeof useSettingsPanel>;
