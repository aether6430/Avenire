"use client";

import type {
  TabKey,
  WorkspaceSummary,
} from "@/components/settings/settings-panel-model";
import { useSettingsWorkspaceManagement } from "@/components/settings/use-settings-workspace-management";
import { useSettingsWorkspaceNoteTemplatesCore } from "@/components/settings/use-settings-workspace-note-templates-core";

export function useSettingsPanelWorkspace({
  currentTab,
  initialWorkspaceId,
  initialWorkspaces,
  refreshSudoStatus,
  requestSudoForAction,
}: {
  currentTab: TabKey;
  initialWorkspaceId?: string;
  initialWorkspaces?: WorkspaceSummary[];
  refreshSudoStatus: () => Promise<void>;
  requestSudoForAction: (
    actionLabel: string,
    action: () => Promise<void>
  ) => void;
}) {
  const management = useSettingsWorkspaceManagement({
    currentTab,
    initialWorkspaceId,
    initialWorkspaces,
    refreshSudoStatus,
    requestSudoForAction,
  });

  const noteTemplates = useSettingsWorkspaceNoteTemplatesCore({
    activeWorkspaceId: management.activeWorkspaceId,
  });

  return {
    ...management,
    ...noteTemplates,
    deleteSelectedWorkspace: management.runDeleteWorkspace,
  };
}

export type SettingsWorkspaceRuntime = ReturnType<
  typeof useSettingsPanelWorkspace
>;
