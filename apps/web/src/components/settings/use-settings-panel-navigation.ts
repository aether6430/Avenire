"use client";

import type { Route } from "next";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  resolveMobileSettingsTabs,
  resolveVisibleSettingsTabs,
  shouldRedirectShortcutSettingsTab,
  shouldSyncSettingsLocalTab,
} from "@/components/settings/settings-navigation-runtime-model";
import type { TabKey } from "@/components/settings/settings-panel-model";
import { buildSettingsOverlayRoute } from "@/lib/settings-overlay-route";

export function useSettingsPanelNavigation({
  hasKeyboardDetected,
  initialTab,
  pathname,
  router,
  searchParams,
}: {
  hasKeyboardDetected: boolean;
  initialTab: TabKey;
  pathname: string;
  router: AppRouterInstance;
  searchParams: ReadonlyURLSearchParams;
}) {
  const [localTab, setLocalTab] = useState<TabKey>(initialTab);
  const currentTab = localTab;

  useEffect(() => {
    if (
      shouldSyncSettingsLocalTab({
        initialTab,
        localTab,
      })
    ) {
      setLocalTab(initialTab);
    }
  }, [initialTab, localTab]);

  const setTab = useCallback(
    (tab: TabKey) => {
      if (tab === currentTab) {
        return;
      }

      setLocalTab(tab);
      router.replace(
        buildSettingsOverlayRoute({
          pathname,
          searchParams,
          tab,
        }) as Route
      );
    },
    [currentTab, pathname, router, searchParams]
  );

  useEffect(() => {
    if (
      shouldRedirectShortcutSettingsTab({
        currentTab,
        hasKeyboardDetected,
      })
    ) {
      setTab("account");
    }
  }, [currentTab, hasKeyboardDetected, setTab]);

  const visibleTabs = resolveVisibleSettingsTabs(hasKeyboardDetected);
  const mobileTabs = resolveMobileSettingsTabs(visibleTabs);

  return {
    currentTab,
    mobileTabs,
    setTab,
    visibleTabs,
  };
}
