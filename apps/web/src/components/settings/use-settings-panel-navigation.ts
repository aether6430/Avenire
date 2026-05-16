"use client";

import type { Route } from "next";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  SETTINGS_TABS,
  type TabKey,
} from "@/components/settings/settings-panel-model";
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
    if (localTab !== initialTab) {
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
    if (currentTab === "shortcuts" && !hasKeyboardDetected) {
      setTab("account");
    }
  }, [currentTab, hasKeyboardDetected, setTab]);

  const visibleTabs = SETTINGS_TABS.filter(
    (tab) => tab.key !== "shortcuts" || hasKeyboardDetected
  );
  const mobileTabs = visibleTabs.filter(
    (tab) => !("mobileHidden" in tab && tab.mobileHidden)
  );

  return {
    currentTab,
    mobileTabs,
    setTab,
    visibleTabs,
  };
}
