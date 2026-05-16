"use client";

import {
  linkSocial,
  listAccounts,
  unlinkAccount,
} from "@avenire/auth/app-client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AccountEntry } from "@/components/settings/settings-panel-model";

export function useSettingsPanelLinkedAccounts({
  currentTab,
}: {
  currentTab: string;
}) {
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [accountsLoadFailed, setAccountsLoadFailed] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsStatus, setAccountsStatus] = useState<string | null>(null);
  const accountsLoadedRef = useRef(false);

  const refreshAccounts = useCallback(async () => {
    setAccountsLoading(true);
    setAccountsLoadFailed(false);
    try {
      const result = await listAccounts();
      setAccounts(
        ((result as { data?: AccountEntry[] | null }).data ??
          []) as AccountEntry[]
      );
      setAccountsLoadFailed(false);
    } catch {
      setAccounts([]);
      setAccountsLoadFailed(true);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentTab !== "account" || accountsLoadedRef.current) {
      return;
    }
    accountsLoadedRef.current = true;
    void refreshAccounts();
  }, [currentTab, refreshAccounts]);

  const linkAccountProvider = async (provider: "github" | "google") => {
    setAccountsStatus(`Connecting ${provider}...`);
    try {
      await linkSocial({ provider });
    } catch {
      setAccountsStatus(`Unable to connect ${provider}.`);
    }
  };

  const unlinkProviderAccount = async (account: AccountEntry) => {
    const providerId = account.providerId;
    if (!providerId) {
      return;
    }

    const result = await unlinkAccount({
      accountId: account.accountId ?? "",
      providerId,
    });
    setAccountsStatus(
      result.error ? "Unable to unlink account." : "Account unlinked."
    );
    await refreshAccounts();
  };

  return {
    accounts,
    accountsLoadFailed,
    accountsLoading,
    accountsStatus,
    linkAccountProvider,
    refreshAccounts,
    setAccountsStatus,
    unlinkProviderAccount,
  };
}
