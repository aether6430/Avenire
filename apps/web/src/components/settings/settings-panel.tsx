"use client";

import { SettingsPanelContent } from "./settings-panel-content";
import { SettingsPanelDialogs } from "./settings-panel-dialogs";
import type {
  SettingsInitialUser,
  TabKey,
  WorkspaceSummary,
} from "./settings-panel-model";
import { useSettingsPanel } from "./use-settings-panel";

export function SettingsPanel({
  initialUser,
  initialWorkspaces,
  initialWorkspaceId,
  initialTab = "account",
}: {
  initialUser?: SettingsInitialUser | null;
  initialWorkspaces?: WorkspaceSummary[];
  initialWorkspaceId?: string;
  initialTab?: TabKey;
}) {
  const runtime = useSettingsPanel({
    initialUser,
    initialTab,
    initialWorkspaceId,
    initialWorkspaces,
  });

  return (
    <>
      <SettingsPanelContent
        initialWorkspaceId={initialWorkspaceId}
        initialWorkspaces={initialWorkspaces}
        runtime={runtime}
      />
      <SettingsPanelDialogs runtime={runtime} />
    </>
  );
}
