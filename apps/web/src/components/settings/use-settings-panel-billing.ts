"use client";
import type { Route } from "next";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadBillingPortalUrl,
  loadBillingUsage,
} from "@/components/settings/settings-billing-client";
import { getBillingPlanLabel } from "@/components/settings/settings-billing-model";
import type {
  BillingUsage,
  TabKey,
} from "@/components/settings/settings-panel-model";
import { buildSettingsOverlayRoute } from "@/lib/settings-overlay-route";

export function useSettingsPanelBilling({
  currentTab,
  pathname,
  router,
  searchParams,
}: {
  currentTab: TabKey;
  pathname: string;
  router: AppRouterInstance;
  searchParams: ReadonlyURLSearchParams;
}) {
  const [billingUsage, setBillingUsage] = useState<BillingUsage | null>(null);
  const [billingLoadFailed, setBillingLoadFailed] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingStatus, setBillingStatus] = useState<string | null>(null);
  const billingLoadedRef = useRef(false);

  const refreshBillingUsage = useCallback(async (showLoading = false) => {
    setBillingLoading(showLoading);
    setBillingLoadFailed(false);
    if (showLoading) {
      setBillingStatus("Loading usage...");
    }

    try {
      setBillingUsage(await loadBillingUsage());
      setBillingLoadFailed(false);
      if (showLoading) {
        setBillingStatus(null);
      }
    } catch (error) {
      setBillingUsage(null);
      setBillingLoadFailed(true);
      if (showLoading) {
        setBillingStatus(
          error instanceof Error
            ? error.message
            : "Unable to load billing usage."
        );
      }
    } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!(currentTab === "billing" && !billingLoadedRef.current)) {
      return;
    }
    billingLoadedRef.current = true;
    void refreshBillingUsage(true);
  }, [currentTab, refreshBillingUsage]);

  useEffect(() => {
    if (!(currentTab === "billing" && billingLoadedRef.current)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshBillingUsage(false);
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [currentTab, refreshBillingUsage]);

  const hasPaidPlan =
    billingUsage?.plan === "core" || billingUsage?.plan === "scholar";
  const currentPlanLabel = getBillingPlanLabel({
    billingUsagePlan: billingUsage?.plan ?? null,
    loadFailed: billingLoadFailed,
    loading: billingLoading,
  });
  const billingMeters = useMemo(
    () =>
      billingUsage
        ? [
            {
              label: "Total credits",
              remaining: billingUsage.combined.totalBalance,
              total: billingUsage.combined.totalCapacity,
              refillAt:
                billingUsage.chat.refillAt ?? billingUsage.upload.refillAt,
            },
            {
              label: "Method credits",
              remaining: billingUsage.chat.totalBalance,
              total: billingUsage.chat.totalCapacity,
              refillAt: billingUsage.chat.refillAt,
            },
            {
              label: "Upload credits",
              remaining: billingUsage.upload.totalBalance,
              total: billingUsage.upload.totalCapacity,
              refillAt: billingUsage.upload.refillAt,
            },
          ]
        : [],
    [billingUsage]
  );
  const billingReturnPath = useMemo(
    () =>
      buildSettingsOverlayRoute({
        pathname,
        searchParams,
        tab: "billing",
      }),
    [pathname, searchParams]
  );

  const handleManageBilling = async () => {
    if (!hasPaidPlan) {
      router.push("/pricing" as Route);
      return;
    }

    setBillingStatus("Opening billing portal...");
    try {
      window.location.href = await loadBillingPortalUrl(billingReturnPath);
    } catch (error) {
      setBillingStatus(
        error instanceof Error
          ? error.message
          : "Unable to open billing portal."
      );
    }
  };

  return {
    billingLoadFailed,
    billingLoading,
    billingMeters,
    billingStatus,
    billingUsage,
    currentPlanLabel,
    handleManageBilling,
    hasPaidPlan,
  };
}
