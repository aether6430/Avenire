"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type {
  TabKey,
  WorkspaceSummary,
} from "@/components/settings/settings-panel-model";
import { SettingsWorkspaceSection } from "@/components/settings/settings-workspace-section";
import {
  type SettingsWorkspaceRuntime,
  useSettingsPanelWorkspace,
} from "@/components/settings/use-settings-panel-workspace";
import type { NoteTemplate } from "@/lib/note-templates";

const SettingsWorkspaceDialogs = dynamic(
  () =>
    import("@/components/settings/settings-workspace-dialogs").then(
      (module) => module.SettingsWorkspaceDialogs
    ),
  { loading: () => null, ssr: false }
);

export interface SettingsWorkspaceSectionRuntime
  extends SettingsWorkspaceRuntime {
  currentUserEmail: string | null;
  openNoteTemplateEditor: (template: NoteTemplate | null) => void;
  privacyMode: boolean;
}

export function SettingsWorkspaceTabShell({
  currentUserEmail,
  currentTab,
  initialWorkspaceId,
  initialWorkspaces,
  privacyMode,
  refreshSudoStatus,
  requestSudoForAction,
  session,
}: {
  currentUserEmail: string | null;
  currentTab: TabKey;
  initialWorkspaceId?: string;
  initialWorkspaces?: WorkspaceSummary[];
  privacyMode: boolean;
  refreshSudoStatus: () => Promise<void>;
  requestSudoForAction: (
    actionLabel: string,
    action: () => Promise<void>
  ) => void;
  session: {
    user?: {
      email?: string | null;
      name?: string | null;
    };
  } | null;
}) {
  const [noteTemplateDialogOpen, setNoteTemplateDialogOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<NoteTemplate | null>(
    null
  );
  const runtime = useSettingsPanelWorkspace({
    currentTab,
    initialWorkspaceId,
    initialWorkspaces,
    refreshSudoStatus,
    requestSudoForAction,
  });
  const openNoteTemplateEditor = (template: NoteTemplate | null) => {
    setActiveTemplate(template);
    setNoteTemplateDialogOpen(true);
  };

  const sectionRuntime: SettingsWorkspaceSectionRuntime = {
    ...runtime,
    currentUserEmail,
    openNoteTemplateEditor,
    privacyMode,
  };

  return (
    <>
      <SettingsWorkspaceSection runtime={sectionRuntime} />
      {noteTemplateDialogOpen ? (
        <SettingsWorkspaceDialogs
          activeWorkspaceId={runtime.activeWorkspaceId}
          currentUserEmail={currentUserEmail}
          initialTemplate={activeTemplate}
          noteTemplates={runtime.noteTemplates}
          onOpenChange={(open) => {
            setNoteTemplateDialogOpen(open);
            if (!open) {
              setActiveTemplate(null);
            }
          }}
          open={noteTemplateDialogOpen}
          selectedWorkspace={runtime.selectedWorkspace}
          session={session}
          setNoteTemplates={runtime.setNoteTemplates}
        />
      ) : null}
    </>
  );
}
