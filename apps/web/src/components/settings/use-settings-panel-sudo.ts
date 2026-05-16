"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useSettingsPanelSudo({ currentTab }: { currentTab: string }) {
  const [sudoActive, setSudoActive] = useState(false);
  const [sudoCode, setSudoCode] = useState("");
  const [sudoStatus, setSudoStatus] = useState<string | null>(null);
  const [sudoDialogOpen, setSudoDialogOpen] = useState(false);
  const [sudoActionLabel, setSudoActionLabel] = useState("this action");
  const [sudoRequestingCode, setSudoRequestingCode] = useState(false);
  const [sudoVerifyingCode, setSudoVerifyingCode] = useState(false);
  const pendingSudoActionRef = useRef<null | (() => Promise<void>)>(null);
  const codeRequestedForSessionRef = useRef(false);
  const securityLoadedRef = useRef(false);

  const refreshSudoStatus = useCallback(async () => {
    const response = await fetch("/api/security/sudo", { cache: "no-store" });
    if (!response.ok) {
      setSudoActive(false);
      setSudoStatus(null);
      return;
    }
    const payload = (await response.json()) as { active?: boolean };
    setSudoActive(Boolean(payload.active));
    if (payload.active) {
      setSudoStatus("Sudo mode is active for this session.");
    } else {
      setSudoStatus(null);
    }
  }, []);

  const requestSudoForAction = (
    actionLabel: string,
    action: () => Promise<void>
  ) => {
    pendingSudoActionRef.current = action;
    setSudoActionLabel(actionLabel);
    setSudoCode("");
    setSudoStatus(null);
    setSudoDialogOpen(true);
  };

  const requestSudoCode = useCallback(async () => {
    setSudoRequestingCode(true);
    setSudoStatus("Sending verification code...");

    try {
      const response = await fetch("/api/security/sudo", {
        body: JSON.stringify({ action: "request" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setSudoStatus(
        response.ok
          ? "Verification code sent to your email."
          : (payload.error ?? "Unable to send code.")
      );
    } finally {
      setSudoRequestingCode(false);
    }
  }, []);

  const verifySudoCodeAndContinue = async () => {
    setSudoVerifyingCode(true);
    setSudoStatus("Verifying code...");

    try {
      const response = await fetch("/api/security/sudo", {
        body: JSON.stringify({ action: "verify", code: sudoCode.trim() }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setSudoActive(false);
        setSudoStatus(payload.error ?? "Invalid or expired code.");
        return;
      }

      setSudoActive(true);
      setSudoCode("");
      setSudoStatus("Sudo mode is active for 12 hours.");

      const pendingAction = pendingSudoActionRef.current;
      pendingSudoActionRef.current = null;
      codeRequestedForSessionRef.current = false;
      setSudoDialogOpen(false);

      if (pendingAction) {
        await pendingAction();
      }
    } finally {
      setSudoVerifyingCode(false);
    }
  };

  useEffect(() => {
    if (currentTab !== "security" || securityLoadedRef.current) {
      return;
    }
    securityLoadedRef.current = true;
    void refreshSudoStatus();
  }, [currentTab, refreshSudoStatus]);

  useEffect(() => {
    if (sudoDialogOpen && !sudoActive && !codeRequestedForSessionRef.current) {
      codeRequestedForSessionRef.current = true;
      void requestSudoCode();
    }
  }, [sudoActive, sudoDialogOpen, requestSudoCode]);

  const verifySudoSession = async () => {
    requestSudoForAction("verify this session", async () => {});
  };

  return {
    codeRequestedForSessionRef,
    pendingSudoActionRef,
    refreshSudoStatus,
    requestSudoCode,
    requestSudoForAction,
    setSudoActive,
    setSudoCode,
    setSudoDialogOpen,
    sudoActionLabel,
    sudoActive,
    sudoCode,
    sudoDialogOpen,
    sudoRequestingCode,
    sudoStatus,
    sudoVerifyingCode,
    verifySudoCodeAndContinue,
    verifySudoSession,
  };
}
