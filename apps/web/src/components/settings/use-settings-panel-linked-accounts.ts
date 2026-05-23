"use client";

import {
  linkSocial,
  listAccounts,
  unlinkAccount,
} from "@avenire/auth/app-client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAccountsRefreshFailureState,
  createAccountsRefreshSuccessState,
  createLinkAccountStatus,
  resolveLinkAccountFailureStatus,
  resolveUnlinkAccountStatus,
  shouldLoadInitialAccounts,
} from "@/components/settings/settings-account-runtime-model";
import type { AccountEntry } from "@/components/settings/settings-panel-model";

export function useSettingsPanelLinkedAccounts({
  currentTab,
}: {
  currentTab: string;
}) {
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [accountsErrorMessage, setAccountsErrorMessage] = useState<
    string | null
  >(null);
  const [accountsLoadFailed, setAccountsLoadFailed] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsStatus, setAccountsStatus] = useState<string | null>(null);
  const accountsLoadedRef = useRef(false);

  const refreshAccounts = useCallback(async () => {
    setAccountsLoading(true);
    setAccountsLoadFailed(false);
    setAccountsErrorMessage(null);
    try {
      const result = await listAccounts();
      const next = createAccountsRefreshSuccessState(result);
      setAccounts(next.accounts);
      setAccountsErrorMessage(next.accountsErrorMessage);
      setAccountsLoadFailed(next.accountsLoadFailed);
    } catch (error) {
      const next = createAccountsRefreshFailureState(
        error instanceof Error ? error.message : null
      );
      setAccounts(next.accounts);
      setAccountsErrorMessage(next.accountsErrorMessage);
      setAccountsLoadFailed(next.accountsLoadFailed);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      !shouldLoadInitialAccounts({
        accountsLoaded: accountsLoadedRef.current,
        currentTab,
      })
    ) {
      return;
    }
    accountsLoadedRef.current = true;
    void refreshAccounts();
  }, [currentTab, refreshAccounts]);

  const linkAccountProvider = async (provider: "github" | "google") => {
    setAccountsStatus(createLinkAccountStatus(provider));
    try {
      await linkSocial({ provider });
    } catch {
      setAccountsStatus(resolveLinkAccountFailureStatus(provider));
    }
  };

  const unlinkProviderAccount = async (account: AccountEntry) => {
    const providerId = account.providerId;
    const accountId = account.accountId ?? account.id;
    if (!(providerId && accountId)) {
      setAccountsStatus(resolveUnlinkAccountStatus({ error: true }));
      return;
    }

    const result = await unlinkAccount({
      accountId,
      providerId,
    });
    setAccountsStatus(resolveUnlinkAccountStatus(result));
    await refreshAccounts();
  };

  return {
    accounts,
    accountsErrorMessage,
    accountsLoadFailed,
    accountsLoading,
    accountsStatus,
    linkAccountProvider,
    refreshAccounts,
    setAccountsStatus,
    unlinkProviderAccount,
  };
}
