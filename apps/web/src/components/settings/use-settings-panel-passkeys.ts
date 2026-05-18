"use client";

import { addPasskey as addPasskeyClient } from "@avenire/auth/passkey-client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PasskeyEntry } from "@/components/settings/settings-panel-model";
import {
  createPasskeysRefreshFailureState,
  createPasskeysRefreshSuccessState,
  resolveAddPasskeyStatus,
  resolveRemovePasskeyStatus,
} from "@/components/settings/settings-security-runtime-model";

export function useSettingsPanelPasskeys({
  currentTab,
}: {
  currentTab: string;
}) {
  const [passkeys, setPasskeys] = useState<PasskeyEntry[]>([]);
  const [passkeysLoadFailed, setPasskeysLoadFailed] = useState(false);
  const [passkeysLoading, setPasskeysLoading] = useState(false);
  const [passkeysStatus, setPasskeysStatus] = useState<string | null>(null);
  const securityLoadedRef = useRef(false);

  const refreshPasskeys = useCallback(async () => {
    setPasskeysLoading(true);
    setPasskeysLoadFailed(false);
    try {
      const response = await fetch("/api/auth/passkey/list-user-passkeys", {
        cache: "no-store",
      });
      if (!response.ok) {
        const next = createPasskeysRefreshFailureState();
        setPasskeys(next.passkeys);
        setPasskeysLoadFailed(next.passkeysLoadFailed);
        return;
      }
      const payload = (await response.json()) as PasskeyEntry[];
      const next = createPasskeysRefreshSuccessState(payload);
      setPasskeys(next.passkeys);
      setPasskeysLoadFailed(next.passkeysLoadFailed);
    } finally {
      setPasskeysLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentTab !== "security" || securityLoadedRef.current) {
      return;
    }
    securityLoadedRef.current = true;
    void refreshPasskeys();
  }, [currentTab, refreshPasskeys]);

  const addPasskey = async () => {
    setPasskeysStatus("Adding passkey...");
    const result = (await addPasskeyClient()) as
      | { error?: unknown }
      | undefined;
    setPasskeysStatus(resolveAddPasskeyStatus(result));
    await refreshPasskeys();
  };

  const removePasskey = async (id: string) => {
    const response = await fetch("/api/auth/passkey/delete-passkey", {
      body: JSON.stringify({ id }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    setPasskeysStatus(resolveRemovePasskeyStatus(response.ok));
    await refreshPasskeys();
  };

  return {
    addPasskey,
    passkeys,
    passkeysLoadFailed,
    passkeysLoading,
    passkeysStatus,
    refreshPasskeys,
    removePasskey,
    setPasskeysStatus,
  };
}
