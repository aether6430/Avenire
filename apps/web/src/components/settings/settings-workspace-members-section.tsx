"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { Input } from "@avenire/ui/components/input";
import { getWorkspaceMembersStateMessage } from "@/components/settings/settings-workspace-model";
import type { SettingsWorkspaceSelectedSectionsProps } from "@/components/settings/settings-workspace-selected-sections-types";
import { SensitiveText } from "@/components/shared/sensitive-text";

export function SettingsWorkspaceMembersSection({
  currentUserEmail,
  inviteWorkspaceMember,
  isInvitingMember,
  privacyMode,
  removeWorkspaceMember,
  selectedWorkspaceMemberCount,
  setWorkspaceEmail,
  workspaceEmail,
  workspaceMembers,
  workspaceMembersErrorMessage,
  workspaceMembersLoadFailed,
  workspaceMembersLoading,
  workspaceStatus,
}: Pick<
  SettingsWorkspaceSelectedSectionsProps,
  | "currentUserEmail"
  | "inviteWorkspaceMember"
  | "isInvitingMember"
  | "privacyMode"
  | "removeWorkspaceMember"
  | "selectedWorkspaceMemberCount"
  | "setWorkspaceEmail"
  | "workspaceEmail"
  | "workspaceMembers"
  | "workspaceMembersErrorMessage"
  | "workspaceMembersLoadFailed"
  | "workspaceMembersLoading"
  | "workspaceStatus"
>) {
  const workspaceMembersStateMessage = getWorkspaceMembersStateMessage({
    errorMessage: workspaceMembersErrorMessage,
    loading: workspaceMembersLoading,
    loadFailed: workspaceMembersLoadFailed,
    memberCount: workspaceMembers.length,
  });

  return (
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
                member.id ?? member.email ?? member.userId ?? `member-${index}`;
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
        <p className="mt-2 text-muted-foreground text-xs">{workspaceStatus}</p>
      ) : null}
    </div>
  );
}
