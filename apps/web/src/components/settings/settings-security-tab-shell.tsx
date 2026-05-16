"use client";

import { revokeOtherSessions } from "@avenire/auth/app-client";
import { useState } from "react";
import type { TabKey } from "@/components/settings/settings-panel-model";
import { SettingsSecuritySection } from "@/components/settings/settings-security-section";
import { useSettingsPanelAccountDanger } from "@/components/settings/use-settings-panel-account-danger";
import { useSettingsPanelPasskeys } from "@/components/settings/use-settings-panel-passkeys";

export interface SettingsSecuritySectionRuntime {
  accountDeleteConfirm: string;
  addPasskey: () => Promise<void>;
  dangerStatus: string | null;
  deleteAccount: () => Promise<void>;
  passkeys: ReturnType<typeof useSettingsPanelPasskeys>["passkeys"];
  passkeysLoadFailed: boolean;
  passkeysLoading: boolean;
  passkeysStatus: string | null;
  removePasskey: (id: string) => Promise<void>;
  revokeOtherDeviceSessions: () => Promise<void>;
  sessionsStatus: string | null;
  setAccountDeleteConfirm: (value: string) => void;
  sudoActive: boolean;
  sudoStatus: string | null;
  verifySudoSession: () => Promise<void>;
}

export function SettingsSecurityTabShell({
  currentTab,
  requestSudoForAction,
  setSudoActive,
  sudoActive,
  sudoStatus,
  verifySudoSession,
}: {
  currentTab: TabKey;
  requestSudoForAction: (
    actionLabel: string,
    action: () => Promise<void>
  ) => void;
  setSudoActive: (active: boolean) => void;
  sudoActive: boolean;
  sudoStatus: string | null;
  verifySudoSession: () => Promise<void>;
}) {
  const [sessionsStatus, setSessionsStatus] = useState<string | null>(null);
  const passkeysRuntime = useSettingsPanelPasskeys({ currentTab });
  const accountDanger = useSettingsPanelAccountDanger({
    requestSudoForAction,
    setSudoActive,
    sudoActive,
  });

  const revokeOtherDeviceSessions = async () => {
    setSessionsStatus("Signing out other devices...");
    const result = await revokeOtherSessions();
    setSessionsStatus(
      result.error
        ? "Unable to sign out other devices."
        : "Signed out from other devices."
    );
  };

  const runtime: SettingsSecuritySectionRuntime = {
    accountDeleteConfirm: accountDanger.accountDeleteConfirm,
    addPasskey: passkeysRuntime.addPasskey,
    dangerStatus: accountDanger.dangerStatus,
    deleteAccount: accountDanger.deleteAccount,
    passkeys: passkeysRuntime.passkeys,
    passkeysLoadFailed: passkeysRuntime.passkeysLoadFailed,
    passkeysLoading: passkeysRuntime.passkeysLoading,
    passkeysStatus: passkeysRuntime.passkeysStatus,
    removePasskey: passkeysRuntime.removePasskey,
    revokeOtherDeviceSessions,
    sessionsStatus,
    setAccountDeleteConfirm: accountDanger.setAccountDeleteConfirm,
    sudoActive,
    sudoStatus,
    verifySudoSession,
  };

  return <SettingsSecuritySection runtime={runtime} />;
}
