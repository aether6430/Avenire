"use client";
import type { Route } from "next";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadBillingPortalUrl,
  loadBillingUsage,
  openProviderBillingPortal,
  startProviderCheckout,
} from "@/components/settings/settings-billing-client";
import { getBillingPlanLabel } from "@/components/settings/settings-billing-model";
import {
  createBillingUsageLoadFailureState,
  createBillingUsageLoadStartState,
  createBillingUsageLoadSuccessState,
  createSettingsBillingMeters,
  hasSettingsPaidPlan,
  resolveManageBillingStatus,
  shouldLoadInitialBillingUsage,
  shouldPollBillingUsage,
} from "@/components/settings/settings-billing-runtime-model";
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
  const [billingErrorMessage, setBillingErrorMessage] = useState<string | null>(
    null
  );
  const [billingLoadFailed, setBillingLoadFailed] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingStatus, setBillingStatus] = useState<string | null>(null);
  const billingLoadedRef = useRef(false);

  const refreshBillingUsage = useCallback(async (showLoading = false) => {
    const loadingState = createBillingUsageLoadStartState(showLoading);
    setBillingErrorMessage(loadingState.billingErrorMessage);
    setBillingLoading(loadingState.billingLoading);
    setBillingLoadFailed(loadingState.billingLoadFailed);
    setBillingStatus(loadingState.billingStatus);

    try {
      const usage = await loadBillingUsage();
      const successState = createBillingUsageLoadSuccessState(
        usage,
        showLoading
      );
      setBillingUsage(successState.billingUsage);
      setBillingErrorMessage(successState.billingErrorMessage);
      setBillingLoadFailed(successState.billingLoadFailed);
      if (successState.billingStatus !== undefined) {
        setBillingStatus(successState.billingStatus);
      }
    } catch (error) {
      const failureState = createBillingUsageLoadFailureState(
        error,
        showLoading
      );
      setBillingUsage(failureState.billingUsage);
      setBillingErrorMessage(failureState.billingErrorMessage);
      setBillingLoadFailed(failureState.billingLoadFailed);
      if (failureState.billingStatus !== undefined) {
        setBillingStatus(failureState.billingStatus);
      }
    } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      !shouldLoadInitialBillingUsage({
        currentTab,
        billingLoaded: billingLoadedRef.current,
      })
    ) {
      return;
    }
    billingLoadedRef.current = true;
    void refreshBillingUsage(true);
  }, [currentTab, refreshBillingUsage]);

  useEffect(() => {
    if (
      !shouldPollBillingUsage({
        currentTab,
        billingLoaded: billingLoadedRef.current,
      })
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshBillingUsage(false);
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [currentTab, refreshBillingUsage]);

  const hasPaidPlan = hasSettingsPaidPlan(billingUsage);
  const currentPlanLabel = getBillingPlanLabel({
    billingUsagePlan: billingUsage?.plan ?? null,
    errorMessage: billingErrorMessage,
    loadFailed: billingLoadFailed,
    loading: billingLoading,
  });
  const billingMeters = useMemo(
    () => createSettingsBillingMeters(billingUsage),
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
      await openProviderBillingPortal();
      return;
    } catch (error) {
      console.error(
        "[settings] failed to open Better Auth Polar portal",
        error
      );
    }

    try {
      window.location.href = await loadBillingPortalUrl(billingReturnPath);
    } catch (error) {
      setBillingStatus(resolveManageBillingStatus(error));
    }
  };

  const handleUpgradePlan = async (plan: "core" | "scholar") => {
    setBillingStatus("Opening checkout...");
    try {
      await startProviderCheckout(plan);
      return;
    } catch (error) {
      console.error("[settings] failed to start Better Auth checkout", error);
    }

    const params = new URLSearchParams({
      billing: "monthly",
      plan,
    });
    window.location.href = `/api/billing/checkout?${params.toString()}`;
  };

  return {
    billingErrorMessage,
    billingLoadFailed,
    billingLoading,
    billingMeters,
    billingStatus,
    billingUsage,
    currentPlanLabel,
    handleManageBilling,
    handleUpgradePlan,
    hasPaidPlan,
  };
}
