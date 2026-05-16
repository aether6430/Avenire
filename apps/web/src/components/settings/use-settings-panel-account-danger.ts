"use client";

import { useState } from "react";

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

    if (response.status === 403) {
      setSudoActive(false);
      setDangerStatus("Verification required.");
      requestSudoForAction("delete your account", runDeleteAccount);
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setDangerStatus(payload.error ?? "Unable to delete account.");
      return;
    }

    window.location.href = "/login";
  };

  const deleteAccount = async () => {
    if (!sudoActive) {
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
