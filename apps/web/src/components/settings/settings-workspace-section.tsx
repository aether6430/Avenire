import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@avenire/ui/components/avatar";
import { Button } from "@avenire/ui/components/button";
import { Input } from "@avenire/ui/components/input";
import { Check, Warning as TriangleAlert, Users } from "@phosphor-icons/react";
import { Camera } from "@phosphor-icons/react/ssr";
import type { SettingsWorkspaceSectionRuntime } from "@/components/settings/settings-workspace-tab-shell";
import { Divider, Section } from "./settings-panel-content-shared";
import { getWorkspaceListStateMessage } from "./settings-workspace-model";
import { SettingsWorkspaceSelectedSections } from "./settings-workspace-selected-sections";

export function SettingsWorkspaceSection({
  runtime,
}: {
  runtime: SettingsWorkspaceSectionRuntime;
}) {
  const {
    activeWorkspaceId,
    createWorkspace,
    currentUserEmail,
    deleteSelectedWorkspace,
    handleWorkspaceIconFileChange,
    inviteWorkspaceMember,
    isCreatingWorkspace,
    isInvitingMember,
    noteTemplates,
    openNoteTemplateEditor,
    privacyMode,
    removeWorkspaceMember,
    saveWorkspaceIcon,
    selectedWorkspace,
    selectedWorkspaceInitial,
    selectedWorkspaceMemberCount,
    setActiveWorkspaceId,
    setNoteTemplates,
    setWorkspaceDeleteConfirm,
    setWorkspaceEmail,
    setWorkspaceIconDraft,
    setWorkspaceName,
    setWorkspaceStatus,
    workspaceDeleteConfirm,
    workspaceEmail,
    workspaceIconDraft,
    workspaceIconInputRef,
    workspaceIconStatus,
    workspaceIconUploading,
    workspaceName,
    workspaceStatus,
    workspaces,
    workspacesLoadFailed,
    workspacesLoading,
  } = runtime;
  const workspaceListStateMessage = getWorkspaceListStateMessage({
    loading: workspacesLoading,
    loadFailed: workspacesLoadFailed,
    workspaceCount: workspaces.length,
  });

  return (
    <>
      <Section
        description="Workspace identity, storage, and member access in one place."
        title="Current workspace"
      >
        <div className="space-y-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar className="size-14 shrink-0 rounded-2xl">
                <AvatarImage
                  alt={selectedWorkspace?.name ?? "Workspace icon"}
                  src={workspaceIconDraft || selectedWorkspace?.logo || ""}
                />
                <AvatarFallback className="rounded-2xl bg-muted font-semibold text-foreground text-lg">
                  {selectedWorkspaceInitial}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium text-muted-foreground text-xs">
                  Workspace identity
                </p>
                <h3 className="truncate font-semibold text-2xl leading-none">
                  {selectedWorkspace?.name ?? "Workspace"}
                </h3>
                <p className="mt-2 truncate text-muted-foreground text-sm">
                  {selectedWorkspace
                    ? "Upload or replace the workspace icon."
                    : (workspaceListStateMessage ??
                      "Select a workspace to inspect its storage and members.")}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3">
              <input
                accept="image/*"
                className="hidden"
                onChange={handleWorkspaceIconFileChange}
                ref={workspaceIconInputRef}
                type="file"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  disabled={!selectedWorkspace || workspaceIconUploading}
                  onClick={() => workspaceIconInputRef.current?.click()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {workspaceIconUploading ? "Uploading..." : "Upload Icon"}
                </Button>
                <Button
                  disabled={!selectedWorkspace || workspaceIconUploading}
                  onClick={() => {
                    setWorkspaceIconDraft("");
                    void saveWorkspaceIcon(null);
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Remove Icon
                </Button>
              </div>
              {workspaceIconStatus ? (
                <p className="text-muted-foreground text-xs">
                  {workspaceIconStatus}
                </p>
              ) : null}
            </div>
          </div>

          {selectedWorkspace ? (
            <SettingsWorkspaceSelectedSections
              currentUserEmail={currentUserEmail}
              inviteWorkspaceMember={inviteWorkspaceMember}
              isInvitingMember={isInvitingMember}
              noteTemplates={noteTemplates}
              openNoteTemplateEditor={openNoteTemplateEditor}
              privacyMode={privacyMode}
              removeWorkspaceMember={removeWorkspaceMember}
              selectedWorkspace={selectedWorkspace}
              selectedWorkspaceMemberCount={selectedWorkspaceMemberCount}
              setNoteTemplates={setNoteTemplates}
              setWorkspaceEmail={setWorkspaceEmail}
              workspaceEmail={workspaceEmail}
              workspaceMembers={runtime.workspaceMembers}
              workspaceMembersLoadFailed={runtime.workspaceMembersLoadFailed}
              workspaceMembersLoading={runtime.workspaceMembersLoading}
              workspaceStatus={workspaceStatus}
              workspaceUsage={runtime.workspaceUsage}
              workspaceUsageLoadFailed={runtime.workspaceUsageLoadFailed}
              workspaceUsageLoading={runtime.workspaceUsageLoading}
              workspaceUsageStatus={runtime.workspaceUsageStatus}
            />
          ) : null}
        </div>
      </Section>

      <Divider />

      <Section
        description="Create and switch between workspaces."
        title="Workspaces"
      >
        <div className="max-w-2xl space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="New workspace name"
              value={workspaceName}
            />
            <Button
              disabled={isCreatingWorkspace || !workspaceName.trim()}
              onClick={() => {
                void createWorkspace();
              }}
              size="sm"
              type="button"
            >
              Create
            </Button>
          </div>

          <div className="space-y-2">
            {workspaceListStateMessage ? (
              <p className="px-0 py-2 text-muted-foreground text-sm">
                {workspaceListStateMessage}
              </p>
            ) : (
              workspaces.map((workspace) => (
                <Button
                  className={[
                    "h-auto w-full justify-start gap-3 px-0 py-2 text-left text-sm transition-colors hover:bg-transparent",
                    workspace.workspaceId === activeWorkspaceId
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                  key={workspace.workspaceId}
                  onClick={() => {
                    setActiveWorkspaceId(workspace.workspaceId);
                    setWorkspaceStatus(null);
                  }}
                  type="button"
                  variant="ghost"
                >
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{workspace.name}</span>
                  {workspace.workspaceId === activeWorkspaceId ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : null}
                </Button>
              ))
            )}
          </div>
        </div>
      </Section>

      <Divider />

      <Section
        description="Delete the selected workspace and all associated files, shares, and access."
        title="Workspace Danger Zone"
      >
        <div className="max-w-md space-y-3">
          <div className="flex items-start gap-2 text-red-600">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs">
              Type the workspace name exactly. If verification is needed, we
              will prompt you after you continue.
            </p>
          </div>
          <Input
            disabled={!selectedWorkspace}
            onChange={(event) => setWorkspaceDeleteConfirm(event.target.value)}
            placeholder={selectedWorkspace?.name ?? "Workspace name"}
            value={workspaceDeleteConfirm}
          />
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={
              !selectedWorkspace ||
              workspaceDeleteConfirm.trim() !== (selectedWorkspace?.name ?? "")
            }
            onClick={() => {
              void deleteSelectedWorkspace();
            }}
            size="sm"
            type="button"
          >
            Delete Workspace
          </Button>
        </div>
      </Section>
    </>
  );
}
