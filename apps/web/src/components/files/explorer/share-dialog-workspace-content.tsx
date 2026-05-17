"use client";

import { Avatar, AvatarFallback } from "@avenire/ui/components/avatar";
import { Button } from "@avenire/ui/components/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@avenire/ui/components/dialog";
import { Label } from "@avenire/ui/components/label";
import { getWorkspaceShareMembersStateMessage } from "@/components/files/explorer/share-dialog-workspace-model";
import type { ShareSuggestion } from "@/components/files/explorer/shared";
import { useShareDialogWorkspaceContent } from "@/components/files/explorer/use-share-dialog-workspace-content";
import { EmailSuggestionInput } from "@/components/shared/email-suggestion-input";

const WORKSPACE_ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
] as const;

interface ShareDialogWorkspaceContentProps {
  loadShareSuggestions: (
    q: string,
    cb: (suggestions: ShareSuggestion[]) => void
  ) => void;
  open: boolean;
  workspaceUuid: string;
}

function getInitials(value: string) {
  return (
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

export function ShareDialogWorkspaceContent({
  loadShareSuggestions,
  open,
  workspaceUuid,
}: ShareDialogWorkspaceContentProps) {
  const {
    notifyWorkspaceTeamMembers,
    requestSuggestions,
    setWorkspaceInviteRole,
    setWorkspaceShareEmail,
    shareWorkspaceWithEmail,
    suggestions,
    workspaceInviteRole,
    workspaceMembers,
    workspaceMembersLoadFailed,
    workspaceMembersLoading,
    workspaceShareBusy,
    workspaceShareEmail,
    workspaceShareStatus,
  } = useShareDialogWorkspaceContent({
    loadShareSuggestions,
    open,
    workspaceUuid,
  });

  return (
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Share workspace</DialogTitle>
        <DialogDescription>
          Share workspace access by email, or notify the whole team with a
          workspace link.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="workspace-share-email">Share with teammates</Label>
        <div className="rounded-lg border border-border/60 bg-background p-3">
          <div className="flex items-center gap-2">
            <EmailSuggestionInput
              id="workspace-share-email"
              onFocus={requestSuggestions}
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }
                event.preventDefault();
                shareWorkspaceWithEmail().catch(() => undefined);
              }}
              onValueChange={setWorkspaceShareEmail}
              placeholder="Add people, groups, or emails..."
              suggestions={suggestions}
              value={workspaceShareEmail}
            />
            <select
              className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm"
              onChange={(event) =>
                setWorkspaceInviteRole(
                  event.target.value === "admin" ? "admin" : "member"
                )
              }
              value={workspaceInviteRole}
            >
              {WORKSPACE_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button
              disabled={workspaceShareBusy}
              onClick={() => {
                shareWorkspaceWithEmail().catch(() => undefined);
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              Grant access
            </Button>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label>People with access</Label>
        <div className="rounded-lg border border-border/60 bg-background">
          {getWorkspaceShareMembersStateMessage({
            loading: workspaceMembersLoading,
            loadFailed: workspaceMembersLoadFailed,
            memberCount: workspaceMembers.length,
          }) ? (
            <div className="px-4 py-6 text-center text-muted-foreground text-sm">
              {getWorkspaceShareMembersStateMessage({
                loading: workspaceMembersLoading,
                loadFailed: workspaceMembersLoadFailed,
                memberCount: workspaceMembers.length,
              })}
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {workspaceMembers.map((member) => {
                const label =
                  member.name?.trim() ||
                  member.email?.trim() ||
                  "Workspace member";
                return (
                  <li
                    className="flex items-center gap-3 px-4 py-3"
                    key={member.userId ?? member.email ?? label}
                  >
                    <Avatar className="size-8">
                      <AvatarFallback className="text-[10px]">
                        {getInitials(label)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">
                        {member.name ?? member.email ?? "Workspace member"}
                      </p>
                      <p className="truncate text-muted-foreground text-xs">
                        {member.email ?? member.userId ?? "No email available"}
                      </p>
                    </div>
                    <span className="rounded-md px-2 py-1 font-mono text-[11px] text-muted-foreground">
                      {member.role}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={workspaceShareBusy}
          onClick={() => {
            void notifyWorkspaceTeamMembers();
          }}
          type="button"
          variant="outline"
        >
          Notify workspace team
        </Button>
      </DialogFooter>
      {workspaceShareStatus ? (
        <p className="text-muted-foreground text-xs">{workspaceShareStatus}</p>
      ) : null}
    </DialogContent>
  );
}
