"use client";

import { Button } from "@avenire/ui/components/button";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@avenire/ui/components/dropdown-menu";
import { Check, Envelope as Mail, UserPlus } from "@phosphor-icons/react";
import { Building as Building2 } from "@phosphor-icons/react/Building";
import type { ReactNode } from "react";
import { SensitiveText } from "../shared/sensitive-text";

export interface WorkspaceSummary {
  name: string;
  organizationId?: string;
  rootFolderId: string;
  workspaceId: string;
}

export interface WorkspaceInvitation {
  id: string;
  inviterEmail: string;
  inviterName: string | null;
  organizationId: string;
  organizationName: string;
}

export function WorkspaceSwitchMenuSection({
  activeWorkspaceId,
  createWorkspaceTrigger,
  subtitle,
  switchWorkspaceEmptyMessage,
  onSwitchWorkspace,
  triggerHaptic,
  workspaces,
}: {
  activeWorkspaceId?: string | null;
  createWorkspaceTrigger: ReactNode;
  subtitle: string;
  switchWorkspaceEmptyMessage: string | null;
  onSwitchWorkspace?: (workspace: WorkspaceSummary) => void;
  triggerHaptic: () => void;
  workspaces: WorkspaceSummary[];
}) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Building2 className="size-4" />
        <div className="min-w-0 flex-1">
          <p className="truncate">Switch Workspace</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-64">
        {switchWorkspaceEmptyMessage ? (
          <DropdownMenuItem disabled>
            <Building2 className="size-4" />
            {switchWorkspaceEmptyMessage}
          </DropdownMenuItem>
        ) : (
          workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.workspaceId}
              onSelect={() => {
                void triggerHaptic();
                onSwitchWorkspace?.(workspace);
              }}
            >
              <Building2 className="size-4" />
              <span className="truncate">{workspace.name}</span>
              {workspace.workspaceId === activeWorkspaceId ? (
                <Check className="ml-auto size-4" />
              ) : null}
            </DropdownMenuItem>
          ))
        )}
        {createWorkspaceTrigger}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

export function WorkspaceInvitesMenuSection({
  emptyMessage,
  invitations,
  onAcceptInvitation,
  onDeclineInvitation,
  privacyMode,
  subtitle,
}: {
  emptyMessage: string | null;
  invitations: WorkspaceInvitation[];
  onAcceptInvitation?: (invitationId: string) => Promise<void> | void;
  onDeclineInvitation?: (invitationId: string) => Promise<void> | void;
  privacyMode: boolean;
  subtitle: string;
}) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <UserPlus className="size-4" />
        <div className="min-w-0 flex-1">
          <p>Workspace invites</p>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-72">
        {emptyMessage ? (
          <DropdownMenuItem disabled>
            <Mail className="size-4" />
            {emptyMessage}
          </DropdownMenuItem>
        ) : (
          invitations.map((invite) => (
            <div
              className="rounded-md border border-border/60 p-2"
              key={invite.id}
            >
              <p className="truncate font-medium text-xs">
                {invite.organizationName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                <SensitiveText
                  className="truncate"
                  privacyMode={privacyMode}
                  value={invite.inviterName ?? invite.inviterEmail}
                />
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    void onAcceptInvitation?.(invite.id);
                  }}
                  size="sm"
                  type="button"
                >
                  Accept
                </Button>
                <Button
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    void onDeclineInvitation?.(invite.id);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Decline
                </Button>
              </div>
            </div>
          ))
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
