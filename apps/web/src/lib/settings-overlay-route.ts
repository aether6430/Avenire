import type { TabKey } from "@/components/settings/settings-panel-model";

type SearchParamsLike = Pick<URLSearchParams, "toString">;

const SUPPORTED_SETTINGS_TABS = new Set<TabKey>([
  "account",
  "preferences",
  "workspace",
  "data",
  "billing",
  "security",
  "shortcuts",
]);

export const DEFAULT_SETTINGS_BILLING_RETURN_PATH =
  "/workspace?overlay=settings&settingsTab=billing";
export const DEFAULT_SETTINGS_BILLING_CHECKOUT_SUCCESS_PATH = `${DEFAULT_SETTINGS_BILLING_RETURN_PATH}&checkout=success`;

export function parseRequestedSettingsTab(value: string | null): TabKey | null {
  if (!value) {
    return null;
  }

  return SUPPORTED_SETTINGS_TABS.has(value as TabKey)
    ? (value as TabKey)
    : null;
}

export function buildSettingsOverlayRoute({
  pathname,
  searchParams,
  tab,
}: {
  pathname: string;
  searchParams: SearchParamsLike;
  tab?: TabKey;
}) {
  const nextParams = new URLSearchParams(searchParams.toString());
  nextParams.set("overlay", "settings");
  if (tab) {
    nextParams.set("settingsTab", tab);
  } else {
    nextParams.delete("settingsTab");
  }

  const nextQuery = nextParams.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function clearSettingsOverlayRoute({
  pathname,
  searchParams,
}: {
  pathname: string;
  searchParams: SearchParamsLike;
}) {
  const nextParams = new URLSearchParams(searchParams.toString());
  nextParams.delete("overlay");
  nextParams.delete("settingsTab");

  const nextQuery = nextParams.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}
