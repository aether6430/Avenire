"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadWorkspaceShareMembers,
  notifyWorkspaceShareTeam,
  type ShareDialogWorkspaceMember,
  shareWorkspaceMemberAccess,
} from "@/components/files/explorer/share-dialog-client";
import type { ShareSuggestion } from "@/components/files/explorer/shared";
import { useShareSuggestionList } from "@/components/files/explorer/use-share-suggestion-list";

export function useShareDialogWorkspaceContent({
  loadShareSuggestions,
  open,
  workspaceUuid,
}: {
  loadShareSuggestions: (
    q: string,
    cb: (suggestions: ShareSuggestion[]) => void
  ) => void;
  open: boolean;
  workspaceUuid: string;
}) {
  const [workspaceShareEmail, setWorkspaceShareEmail] = useState("");
  const [workspaceShareBusy, setWorkspaceShareBusy] = useState(false);
  const [workspaceShareStatus, setWorkspaceShareStatus] = useState<
    string | null
  >(null);
  const [workspaceInviteRole, setWorkspaceInviteRole] = useState<
    "admin" | "member"
  >("member");
  const [workspaceMembers, setWorkspaceMembers] = useState<
    ShareDialogWorkspaceMember[]
  >([]);
  const [workspaceMembersLoadFailed, setWorkspaceMembersLoadFailed] =
    useState(false);
  const [workspaceMembersLoading, setWorkspaceMembersLoading] = useState(false);
  const { requestSuggestions, suggestions } = useShareSuggestionList({
    enabled: open,
    loadShareSuggestions,
    query: workspaceShareEmail,
    workspaceUuid,
  });

  const refreshWorkspaceMembers = useCallback(async () => {
    setWorkspaceMembersLoading(true);
    setWorkspaceMembersLoadFailed(false);
    try {
      const members = await loadWorkspaceShareMembers({ workspaceUuid });
      if (members === null) {
        setWorkspaceMembersLoadFailed(true);
        return;
      }
      setWorkspaceMembers(members);
    } catch {
      setWorkspaceMembersLoadFailed(true);
    } finally {
      setWorkspaceMembersLoading(false);
    }
  }, [workspaceUuid]);

  useEffect(() => {
    if (open) {
      void refreshWorkspaceMembers();
    }
  }, [open, refreshWorkspaceMembers]);

  const shareWorkspaceWithEmail = useCallback(async () => {
    if (!(workspaceUuid && workspaceShareEmail.trim())) {
      return;
    }

    setWorkspaceShareBusy(true);
    setWorkspaceShareStatus(null);
    try {
      const result = await shareWorkspaceMemberAccess({
        email: workspaceShareEmail.trim(),
        role: workspaceInviteRole,
        workspaceUuid,
      });
      if (!result.ok) {
        setWorkspaceShareStatus(result.error);
        return;
      }

      setWorkspaceShareEmail("");
      setWorkspaceShareStatus(
        result.status === "added"
          ? `${workspaceInviteRole === "admin" ? "Admin" : "Member"} access granted.`
          : result.status === "invited"
            ? `${workspaceInviteRole === "admin" ? "Admin" : "Member"} invite sent.`
            : result.status === "updated"
              ? `${workspaceInviteRole === "admin" ? "Admin" : "Member"} access updated.`
              : "Workspace access updated."
      );
      void refreshWorkspaceMembers();
    } finally {
      setWorkspaceShareBusy(false);
    }
  }, [
    refreshWorkspaceMembers,
    workspaceInviteRole,
    workspaceShareEmail,
    workspaceUuid,
  ]);

  const notifyWorkspaceTeamMembers = useCallback(async () => {
    setWorkspaceShareBusy(true);
    setWorkspaceShareStatus(null);
    try {
      const result = await notifyWorkspaceShareTeam({ workspaceUuid });
      if (!result.ok) {
        setWorkspaceShareStatus(result.error);
        return;
      }

      if (result.queued) {
        setWorkspaceShareStatus(
          `Workspace share notifications queued for ${result.recipients} teammates.`
        );
        return;
      }

      setWorkspaceShareStatus(
        `Workspace share notification sent to ${result.emailSentCount} teammates.`
      );
    } finally {
      setWorkspaceShareBusy(false);
    }
  }, [workspaceUuid]);

  return {
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
  };
}
