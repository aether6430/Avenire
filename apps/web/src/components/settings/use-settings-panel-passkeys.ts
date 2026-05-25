"use client";

import { addPasskey as addPasskeyClient } from "@avenire/auth/client";
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
  const [passkeysErrorMessage, setPasskeysErrorMessage] = useState<
    string | null
  >(null);
  const [passkeysLoadFailed, setPasskeysLoadFailed] = useState(false);
  const [passkeysLoading, setPasskeysLoading] = useState(false);
  const [passkeysStatus, setPasskeysStatus] = useState<string | null>(null);
  const securityLoadedRef = useRef(false);

  const refreshPasskeys = useCallback(async () => {
    setPasskeysLoading(true);
    setPasskeysLoadFailed(false);
    setPasskeysErrorMessage(null);
    try {
      const response = await fetch("/api/auth/passkey/list-user-passkeys", {
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        const next = createPasskeysRefreshFailureState(payload.error);
        setPasskeys(next.passkeys);
        setPasskeysErrorMessage(next.passkeysErrorMessage);
        setPasskeysLoadFailed(next.passkeysLoadFailed);
        return;
      }
      const payload = (await response.json()) as PasskeyEntry[];
      const next = createPasskeysRefreshSuccessState(payload);
      setPasskeys(next.passkeys);
      setPasskeysErrorMessage(next.passkeysErrorMessage);
      setPasskeysLoadFailed(next.passkeysLoadFailed);
    } catch (error) {
      const next = createPasskeysRefreshFailureState(
        error instanceof Error ? error.message : null
      );
      setPasskeys(next.passkeys);
      setPasskeysErrorMessage(next.passkeysErrorMessage);
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
    }).catch(() => null);

    if (!response) {
      setPasskeysStatus(
        resolveRemovePasskeyStatus({
          responseOk: false,
        })
      );
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    setPasskeysStatus(
      resolveRemovePasskeyStatus({
        error: payload.error,
        responseOk: response.ok,
      })
    );
    await refreshPasskeys();
  };

  return {
    addPasskey,
    passkeys,
    passkeysErrorMessage,
    passkeysLoadFailed,
    passkeysLoading,
    passkeysStatus,
    refreshPasskeys,
    removePasskey,
    setPasskeysStatus,
  };
}
