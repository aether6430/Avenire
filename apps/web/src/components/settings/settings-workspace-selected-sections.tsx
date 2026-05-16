"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { Input } from "@avenire/ui/components/input";
import { Spinner } from "@avenire/ui/components/spinner";
import { FileText, Folder, HardDrive, Users } from "@phosphor-icons/react";
import {
  getWorkspaceMembersStateMessage,
  getWorkspaceUsageValueState,
} from "@/components/settings/settings-workspace-model";
import {
  formatBytes,
  type WorkspaceMember,
} from "@/components/settings/use-settings-panel";
import { SensitiveText } from "@/components/shared/sensitive-text";
import {
  DEFAULT_NOTE_TEMPLATE,
  getDefaultNoteTemplates,
} from "@/lib/note-templates";
import { UsageStatCard } from "./settings-panel-content-shared";

interface WorkspaceUsageLike {
  fileCount: number;
  folderCount: number;
  indexedFileCount: number;
  pendingIngestionCount: number;
  totalSizeBytes: number;
}

interface WorkspaceSummaryLike {
  name: string;
}

interface NoteTemplateLike {
  bannerUrl: string | null;
  content: string;
  id: string;
  name: string;
}

export function SettingsWorkspaceSelectedSections({
  currentUserEmail,
  inviteWorkspaceMember,
  isInvitingMember,
  noteTemplates,
  openNoteTemplateEditor,
  privacyMode,
  removeWorkspaceMember,
  selectedWorkspace,
  selectedWorkspaceMemberCount,
  setNoteTemplates,
  setWorkspaceEmail,
  workspaceEmail,
  workspaceMembers,
  workspaceMembersLoadFailed,
  workspaceMembersLoading,
  workspaceStatus,
  workspaceUsage,
  workspaceUsageLoadFailed,
  workspaceUsageLoading,
  workspaceUsageStatus,
}: {
  currentUserEmail: string | null;
  inviteWorkspaceMember: () => Promise<void>;
  isInvitingMember: boolean;
  noteTemplates: NoteTemplateLike[];
  openNoteTemplateEditor: (template: NoteTemplateLike | null) => void;
  privacyMode: boolean;
  removeWorkspaceMember: (memberIdOrEmail: string) => Promise<void>;
  selectedWorkspace: WorkspaceSummaryLike;
  selectedWorkspaceMemberCount: number;
  setNoteTemplates: (
    updater: (current: NoteTemplateLike[]) => NoteTemplateLike[]
  ) => void;
  setWorkspaceEmail: (email: string) => void;
  workspaceEmail: string;
  workspaceMembers: WorkspaceMember[];
  workspaceMembersLoadFailed: boolean;
  workspaceMembersLoading: boolean;
  workspaceStatus: string | null;
  workspaceUsage: WorkspaceUsageLike | null;
  workspaceUsageLoadFailed: boolean;
  workspaceUsageLoading: boolean;
  workspaceUsageStatus: string | null;
}) {
  const workspaceMembersStateMessage = getWorkspaceMembersStateMessage({
    loading: workspaceMembersLoading,
    loadFailed: workspaceMembersLoadFailed,
    memberCount: workspaceMembers.length,
  });
  const storageUsageValue = getWorkspaceUsageValueState({
    loading: workspaceUsageLoading,
    loadFailed: workspaceUsageLoadFailed,
    readyLabel: workspaceUsage
      ? formatBytes(workspaceUsage.totalSizeBytes)
      : "0 B",
  });
  const filesUsageValue = getWorkspaceUsageValueState({
    loading: workspaceUsageLoading,
    loadFailed: workspaceUsageLoadFailed,
    readyLabel: workspaceUsage
      ? workspaceUsage.fileCount.toLocaleString()
      : "0",
  });
  const foldersUsageValue = getWorkspaceUsageValueState({
    loading: workspaceUsageLoading,
    loadFailed: workspaceUsageLoadFailed,
    readyLabel: workspaceUsage
      ? workspaceUsage.folderCount.toLocaleString()
      : "0",
  });
  const indexedUsageValue = getWorkspaceUsageValueState({
    loading: workspaceUsageLoading,
    loadFailed: workspaceUsageLoadFailed,
    readyLabel: workspaceUsage
      ? workspaceUsage.indexedFileCount.toLocaleString()
      : "0",
  });

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">Workspace stats</p>
          <p className="inline-flex items-center gap-2 text-muted-foreground text-xs">
            {workspaceUsageStatus?.startsWith("Loading") ? (
              <Spinner className="size-3.5" />
            ) : null}
            {workspaceUsageStatus ?? "Live workspace totals"}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <UsageStatCard
            description="Total bytes stored across workspace files."
            icon={HardDrive}
            label="Storage Used"
            value={
              storageUsageValue.showSpinner ? (
                <span className="inline-flex items-center gap-1.5">
                  <Spinner className="size-4" />
                  {storageUsageValue.label}
                </span>
              ) : (
                storageUsageValue.label
              )
            }
          />
          <UsageStatCard
            description="Files available in this workspace."
            icon={FileText}
            label="Files"
            value={
              filesUsageValue.showSpinner ? (
                <span className="inline-flex items-center gap-1.5">
                  <Spinner className="size-4" />
                  {filesUsageValue.label}
                </span>
              ) : (
                filesUsageValue.label
              )
            }
          />
          <UsageStatCard
            description="Nested folders in the workspace tree."
            icon={Folder}
            label="Folders"
            value={
              foldersUsageValue.showSpinner ? (
                <span className="inline-flex items-center gap-1.5">
                  <Spinner className="size-4" />
                  {foldersUsageValue.label}
                </span>
              ) : (
                foldersUsageValue.label
              )
            }
          />
          <UsageStatCard
            description={
              workspaceUsage
                ? `${workspaceUsage.pendingIngestionCount.toLocaleString()} pending ingestion`
                : workspaceUsageLoadFailed
                  ? "Workspace stats are unavailable right now."
                  : "Waiting for ingestion status."
            }
            icon={Users}
            label="Indexed"
            value={
              indexedUsageValue.showSpinner ? (
                <span className="inline-flex items-center gap-1.5">
                  <Spinner className="size-4" />
                  {indexedUsageValue.label}
                </span>
              ) : (
                indexedUsageValue.label
              )
            }
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-sm">Note templates</p>
            <p className="text-muted-foreground text-xs">
              Templates are stored per workspace and can use note variables when
              you create a new note.
            </p>
          </div>
          <Button
            onClick={() => openNoteTemplateEditor(null)}
            size="sm"
            type="button"
            variant="outline"
          >
            New template
          </Button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {noteTemplates.map((template) => (
            <div className="space-y-3 p-0" key={template.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">
                    {template.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {template.bannerUrl
                      ? "Template banner enabled"
                      : "Markdown template"}
                  </p>
                </div>
                <Badge variant="secondary">Template</Badge>
              </div>
              {template.bannerUrl ? (
                <div
                  className="mt-3 h-24 overflow-hidden rounded-xl border border-border/60 bg-muted/30"
                  style={{
                    backgroundImage: `url(${template.bannerUrl})`,
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                  }}
                />
              ) : null}
              <p className="mt-3 line-clamp-6 whitespace-pre-wrap text-muted-foreground text-xs">
                {template.content}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Button
                  onClick={() => openNoteTemplateEditor(template)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Edit
                </Button>
                {template.id !== DEFAULT_NOTE_TEMPLATE.id ? (
                  <Button
                    onClick={() => {
                      setNoteTemplates((current) => {
                        const next = current.filter(
                          (item) => item.id !== template.id
                        );
                        return next.length > 0
                          ? next
                          : getDefaultNoteTemplates();
                      });
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium text-sm">Members</p>
          <Badge className="rounded-full px-3 py-1 text-xs" variant="outline">
            {`${selectedWorkspaceMemberCount} total`}
          </Badge>
        </div>

        <div className="mt-3">
          <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(110px,0.8fr)_minmax(0,1.6fr)_minmax(90px,0.8fr)_auto] px-0 py-0 font-medium text-muted-foreground text-xs">
            <span>User</span>
            <span>Role</span>
            <span>Email</span>
            <span>Date added</span>
            <span className="text-right">Action</span>
          </div>
          <div className="divide-y divide-border/60">
            {workspaceMembersStateMessage ? (
              <div className="px-4 py-6 text-muted-foreground text-sm">
                {workspaceMembersStateMessage}
              </div>
            ) : (
              workspaceMembers.map((member, index) => {
                const memberKey =
                  member.id ??
                  member.email ??
                  member.userId ??
                  `member-${index}`;
                const isCurrentUser =
                  Boolean(currentUserEmail) &&
                  member.email?.toLowerCase() === currentUserEmail;
                const isOwner = member.role.toLowerCase() === "owner";

                return (
                  <div
                    className="grid grid-cols-[minmax(0,1.5fr)_minmax(110px,0.8fr)_minmax(0,1.6fr)_minmax(90px,0.8fr)_auto] items-center gap-3 px-0 py-2 text-sm"
                    key={memberKey}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        <SensitiveText
                          className="max-w-[220px]"
                          privacyMode={privacyMode}
                          value={member.name ?? member.email ?? "Unknown user"}
                        />
                      </p>
                    </div>
                    <span className="text-muted-foreground capitalize">
                      {member.role}
                    </span>
                    <p className="truncate text-muted-foreground">
                      <SensitiveText
                        className="max-w-[260px]"
                        privacyMode={privacyMode}
                        value={member.email ?? "—"}
                      />
                    </p>
                    <span className="text-muted-foreground">—</span>
                    <div className="flex justify-end">
                      {isOwner || isCurrentUser ? (
                        <Badge
                          className="rounded-full px-3 py-1 text-xs"
                          variant="outline"
                        >
                          You
                        </Badge>
                      ) : (
                        <Button
                          onClick={() => {
                            const memberIdOrEmail = member.id ?? member.email;
                            if (!memberIdOrEmail) {
                              return;
                            }
                            void removeWorkspaceMember(memberIdOrEmail);
                          }}
                          size="xs"
                          type="button"
                          variant="ghost"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            onChange={(event) => setWorkspaceEmail(event.target.value)}
            placeholder="teammate@example.com"
            value={workspaceEmail}
          />
          <Button
            disabled={isInvitingMember || !workspaceEmail.trim()}
            onClick={() => {
              if (!workspaceEmail.trim()) {
                return;
              }
              void inviteWorkspaceMember();
            }}
            size="sm"
            type="button"
          >
            Add member
          </Button>
        </div>

        {workspaceStatus ? (
          <p className="mt-2 text-muted-foreground text-xs">
            {workspaceStatus}
          </p>
        ) : null}
      </div>
    </>
  );
}
