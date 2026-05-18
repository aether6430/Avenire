"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSudoActionRequestState,
  createSudoCodeRequestStartState,
  createSudoVerifyStartState,
  createSudoVerifySuccessState,
  resolveSudoCodeRequestStatus,
  resolveSudoStatusPayload,
  resolveSudoVerifyFailureState,
  shouldAutoRequestSudoCode,
  shouldLoadInitialSudoStatus,
} from "@/components/settings/settings-sudo-runtime-model";

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
    const next = resolveSudoStatusPayload(Boolean(payload.active));
    setSudoActive(next.sudoActive);
    setSudoStatus(next.sudoStatus);
  }, []);

  const requestSudoForAction = (
    actionLabel: string,
    action: () => Promise<void>
  ) => {
    pendingSudoActionRef.current = action;
    const next = createSudoActionRequestState(actionLabel);
    setSudoActionLabel(next.sudoActionLabel);
    setSudoCode(next.sudoCode);
    setSudoStatus(next.sudoStatus);
    setSudoDialogOpen(next.sudoDialogOpen);
  };

  const requestSudoCode = useCallback(async () => {
    const startState = createSudoCodeRequestStartState();
    setSudoRequestingCode(startState.sudoRequestingCode);
    setSudoStatus(startState.sudoStatus);

    try {
      const response = await fetch("/api/security/sudo", {
        body: JSON.stringify({ action: "request" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      const next = resolveSudoCodeRequestStatus({
        error: payload.error,
        responseOk: response.ok,
      });
      setSudoStatus(next.sudoStatus);
    } finally {
      setSudoRequestingCode(false);
    }
  }, []);

  const verifySudoCodeAndContinue = async () => {
    const startState = createSudoVerifyStartState();
    setSudoVerifyingCode(startState.sudoVerifyingCode);
    setSudoStatus(startState.sudoStatus);

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
        const next = resolveSudoVerifyFailureState(payload.error);
        setSudoActive(next.sudoActive);
        setSudoStatus(next.sudoStatus);
        setSudoVerifyingCode(next.sudoVerifyingCode);
        return;
      }

      const next = createSudoVerifySuccessState();
      setSudoActive(next.sudoActive);
      setSudoCode(next.sudoCode);
      setSudoStatus(next.sudoStatus);
      setSudoDialogOpen(next.sudoDialogOpen);
      setSudoVerifyingCode(next.sudoVerifyingCode);

      const pendingAction = pendingSudoActionRef.current;
      pendingSudoActionRef.current = null;
      codeRequestedForSessionRef.current = next.resetCodeRequested
        ? false
        : codeRequestedForSessionRef.current;

      if (pendingAction) {
        await pendingAction();
      }
    } finally {
      setSudoVerifyingCode(false);
    }
  };

  useEffect(() => {
    if (
      !shouldLoadInitialSudoStatus({
        currentTab,
        securityLoaded: securityLoadedRef.current,
      })
    ) {
      return;
    }
    securityLoadedRef.current = true;
    void refreshSudoStatus();
  }, [currentTab, refreshSudoStatus]);

  useEffect(() => {
    if (
      shouldAutoRequestSudoCode({
        codeRequested: codeRequestedForSessionRef.current,
        sudoActive,
        sudoDialogOpen,
      })
    ) {
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
