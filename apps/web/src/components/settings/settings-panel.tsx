"use client";

import dynamic from "next/dynamic";
import { SettingsPanelContent } from "./settings-panel-content";
import { SettingsPanelDialogs } from "./settings-panel-dialogs";
import type { TabKey, WorkspaceSummary } from "./settings-panel-model";
import { useSettingsPanel } from "./use-settings-panel";

const DeferredAvenireEditor = dynamic(() => import("@/components/editor"), {
  loading: () => (
    <div className="flex min-h-[18rem] items-center justify-center text-muted-foreground text-sm">
      Loading editor...
    </div>
  ),
  ssr: false,
});

export function SettingsPanel({
  initialWorkspaces,
  initialWorkspaceId,
  initialTab = "account",
}: {
  initialWorkspaces?: WorkspaceSummary[];
  initialWorkspaceId?: string;
  initialTab?: TabKey;
}) {
  const runtime = useSettingsPanel({
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
