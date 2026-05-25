"use client";

import { useState } from "react";
import {
  resolveAccountDeleteResponse,
  shouldRequestSudoForAccountDelete,
} from "@/components/settings/settings-security-runtime-model";

export function useSettingsPanelAccountDanger({
  requestSudoForAction,
  setSudoActive,
  sudoActive,
}: {
  requestSudoForAction: (
    actionLabel: string,
    action: () => Promise<void>
  ) => void;
  setSudoActive: (active: boolean) => void;
  sudoActive: boolean;
}) {
  const [accountDeleteConfirm, setAccountDeleteConfirm] = useState("");
  const [dangerStatus, setDangerStatus] = useState<string | null>(null);

  const runDeleteAccount = async () => {
    setDangerStatus("Deleting account...");
    const response = await fetch("/api/account", { method: "DELETE" });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    const result = resolveAccountDeleteResponse({
      payloadError: payload.error ?? null,
      responseOk: response.ok,
      responseStatus: response.status,
    });

    if (result.kind === "sudo_required") {
      setSudoActive(false);
      setDangerStatus(result.status);
      requestSudoForAction("delete your account", runDeleteAccount);
      return;
    }

    if (result.kind === "error") {
      setDangerStatus(result.status);
      return;
    }

    window.location.href = result.href;
  };

  const deleteAccount = async () => {
    if (shouldRequestSudoForAccountDelete(sudoActive)) {
      requestSudoForAction("delete your account", runDeleteAccount);
      return;
    }

    await runDeleteAccount();
  };

  return {
    accountDeleteConfirm,
    dangerStatus,
    deleteAccount,
    runDeleteAccount,
    setAccountDeleteConfirm,
  };
}
