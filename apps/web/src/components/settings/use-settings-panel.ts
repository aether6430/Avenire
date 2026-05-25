"use client";

import { useSession } from "@avenire/auth/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import type {
  SettingsInitialUser,
  TabKey,
  WorkspaceSummary,
} from "@/components/settings/settings-panel-model";
import {
  createSettingsSessionFallback,
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
import { useUserStore } from "@/stores/userStore";

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
  initialUser,
  initialWorkspaces,
  initialWorkspaceId,
  initialTab = "account",
}: {
  initialUser?: SettingsInitialUser | null;
  initialWorkspaces?: WorkspaceSummary[];
  initialWorkspaceId?: string;
  initialTab?: TabKey;
}) {
  const { data: sessionData } = useSession();
  const bootstrapUser = useUserStore((state) => state.user);
  const session = sessionData ?? createSettingsSessionFallback(initialUser);
  const resolvedSessionUser = session?.user ?? bootstrapUser ?? null;
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
    sessionUser: resolvedSessionUser,
  });
  const sudoRuntime = useSettingsPanelSudo({ currentTab });
  const currentUserEmail = resolvedSessionUser?.email?.toLowerCase() ?? null;

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
    resolvedSessionUser,
    session,
    setTheme,
    theme,
  };
}

export type SettingsPanelRuntime = ReturnType<typeof useSettingsPanel>;
