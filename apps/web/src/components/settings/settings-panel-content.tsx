"use client";

import { revokeOtherSessions } from "@avenire/auth/client";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { SettingsShortcutsSection } from "@/components/settings/settings-misc-sections";
import type { WorkspaceSummary } from "@/components/settings/settings-panel-model";
import { SettingsPanelShell } from "@/components/settings/settings-panel-shell";
import {
  SettingsSecuritySection,
  type SettingsSecuritySectionRuntime,
} from "@/components/settings/settings-security-section";
import { SettingsWorkspaceSection } from "@/components/settings/settings-workspace-section";
import type { SettingsPanelRuntime } from "@/components/settings/use-settings-panel";
import { useSettingsPanelAccountDanger } from "@/components/settings/use-settings-panel-account-danger";
import { useSettingsPanelPasskeys } from "@/components/settings/use-settings-panel-passkeys";
import { useSettingsPanelShortcuts } from "@/components/settings/use-settings-panel-shortcuts";
import { useSettingsWorkspaceManagement } from "@/components/settings/use-settings-workspace-management";

const SettingsAccountSection = dynamic(
  () =>
    import("@/components/settings/settings-account-section").then(
      (module) => module.SettingsAccountSection
    ),
  { ssr: false }
);

const SettingsBillingSection = dynamic(
  () =>
    import("@/components/settings/settings-billing-section").then(
      (module) => module.SettingsBillingSection
    ),
  { ssr: false }
);

const SettingsDataSection = dynamic(
  () =>
    import("@/components/settings/settings-misc-sections").then(
      (module) => module.SettingsDataSection
    ),
  { ssr: false }
);

const SettingsPreferencesSection = dynamic(
  () =>
    import("@/components/settings/settings-preferences-section").then(
      (module) => module.SettingsPreferencesSection
    ),
  { ssr: false }
);

function ReadySettingsWorkspaceSection({
  currentTab,
  currentUserEmail,
  initialWorkspaceId,
  initialWorkspaces,
  privacyMode,
  refreshSudoStatus,
  requestSudoForAction,
}: {
  currentTab: SettingsPanelRuntime["currentTab"];
  currentUserEmail: string | null;
  initialWorkspaceId?: string;
  initialWorkspaces?: WorkspaceSummary[];
  privacyMode: boolean;
  refreshSudoStatus: () => Promise<void>;
  requestSudoForAction: (
    actionLabel: string,
    action: () => Promise<void>
  ) => void;
}) {
  const runtime = useSettingsWorkspaceManagement({
    currentTab,
    initialWorkspaceId,
    initialWorkspaces,
    refreshSudoStatus,
    requestSudoForAction,
  });

  return (
    <SettingsWorkspaceSection
      runtime={{
        ...runtime,
        currentUserEmail,
        deleteSelectedWorkspace: runtime.runDeleteWorkspace,
        privacyMode,
      }}
    />
  );
}

function ReadySettingsSecuritySection({
  currentTab,
  requestSudoForAction,
  setSudoActive,
  sudoActive,
  sudoStatus,
  verifySudoSession,
}: {
  currentTab: SettingsPanelRuntime["currentTab"];
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
    passkeysErrorMessage: passkeysRuntime.passkeysErrorMessage,
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

function renderCurrentTab(
  runtime: SettingsPanelRuntime,
  input: {
    initialWorkspaceId?: string;
    initialWorkspaces?: WorkspaceSummary[];
  }
) {
  switch (runtime.currentTab) {
    case "account":
      return <SettingsAccountSection runtime={runtime} />;
    case "billing":
      return <SettingsBillingSection runtime={runtime} />;
    case "security":
      return (
        <ReadySettingsSecuritySection
          currentTab={runtime.currentTab}
          requestSudoForAction={runtime.requestSudoForAction}
          setSudoActive={runtime.setSudoActive}
          sudoActive={runtime.sudoActive}
          sudoStatus={runtime.sudoStatus}
          verifySudoSession={runtime.verifySudoSession}
        />
      );
    case "preferences":
      return <SettingsPreferencesSection runtime={runtime} />;
    case "workspace":
      return (
        <ReadySettingsWorkspaceSection
          currentTab={runtime.currentTab}
          currentUserEmail={runtime.currentUserEmail}
          initialWorkspaceId={input.initialWorkspaceId}
          initialWorkspaces={input.initialWorkspaces}
          privacyMode={runtime.privacyMode}
          refreshSudoStatus={runtime.refreshSudoStatus}
          requestSudoForAction={runtime.requestSudoForAction}
        />
      );
    case "data":
      return (
        <SettingsDataSection
          runtime={runtime}
          workspaces={input.initialWorkspaces ?? []}
        />
      );
    default:
      return null;
  }
}

export function SettingsPanelContent({
  initialWorkspaceId,
  initialWorkspaces,
  runtime,
}: {
  initialWorkspaceId?: string;
  initialWorkspaces?: WorkspaceSummary[];
  runtime: SettingsPanelRuntime;
}) {
  const shortcutsRuntime = useSettingsPanelShortcuts();

  return (
    <SettingsPanelShell runtime={runtime}>
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          initial={{ opacity: 0, y: 6 }}
          key={runtime.currentTab}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {runtime.currentTab === "shortcuts" ? (
            <SettingsShortcutsSection {...shortcutsRuntime} />
          ) : (
            renderCurrentTab(runtime, { initialWorkspaceId, initialWorkspaces })
          )}
        </motion.div>
      </AnimatePresence>
    </SettingsPanelShell>
  );
}
