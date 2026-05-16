"use client";

import dynamic from "next/dynamic";
import type { WorkspaceSummary } from "@/components/settings/settings-panel-model";
import { SettingsPanelShell } from "@/components/settings/settings-panel-shell";
import type { SettingsPanelRuntime } from "@/components/settings/use-settings-panel";

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

const SettingsShortcutsSection = dynamic(
  () =>
    import("@/components/settings/settings-shortcuts-tab-shell").then(
      (module) => module.SettingsShortcutsTabShell
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

const SettingsSecuritySection = dynamic(
  () =>
    import("@/components/settings/settings-security-tab-shell").then(
      (module) => module.SettingsSecurityTabShell
    ),
  { ssr: false }
);

const SettingsWorkspaceSection = dynamic(
  () =>
    import("@/components/settings/settings-workspace-tab-shell").then(
      (module) => module.SettingsWorkspaceTabShell
    ),
  { ssr: false }
);

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
        <SettingsSecuritySection
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
        <SettingsWorkspaceSection
          currentTab={runtime.currentTab}
          currentUserEmail={runtime.currentUserEmail}
          initialWorkspaceId={input.initialWorkspaceId}
          initialWorkspaces={input.initialWorkspaces}
          privacyMode={runtime.privacyMode}
          refreshSudoStatus={runtime.refreshSudoStatus}
          requestSudoForAction={runtime.requestSudoForAction}
          session={runtime.session}
        />
      );
    case "data":
      return (
        <SettingsDataSection
          runtime={runtime}
          workspaces={input.initialWorkspaces ?? []}
        />
      );
    case "shortcuts":
      return <SettingsShortcutsSection />;
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
  return (
    <SettingsPanelShell runtime={runtime}>
      {renderCurrentTab(runtime, { initialWorkspaceId, initialWorkspaces })}
    </SettingsPanelShell>
  );
}
