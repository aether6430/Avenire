"use client";

import { Avatar, AvatarFallback } from "@avenire/ui/components/avatar";
import { Button } from "@avenire/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@avenire/ui/components/dialog";
import { Input } from "@avenire/ui/components/input";
import { Label } from "@avenire/ui/components/label";
import { ShareNetwork as Share2 } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import type {
  FileRecord,
  FolderRecord,
  ShareSuggestion,
} from "@/components/files/explorer/shared";
import { EmailSuggestionInput } from "@/components/shared/email-suggestion-input";

export interface ShareDialogProps {
  activeFile?: FileRecord | null;
  compact?: boolean;
  currentFolder?: FolderRecord | null;
  hideTrigger?: boolean;
  isAtWorkspaceRoot?: boolean;
  loadShareSuggestions: (q: string, cb: (s: ShareSuggestion[]) => void) => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  segmented?: boolean;
  variant: "file" | "folder";
  workspaceUuid: string;
}

const WORKSPACE_ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
] as const;

export function ShareDialog({
  variant,
  compact = false,
  segmented = false,
  hideTrigger = false,
  open,
  onOpenChange,
  workspaceUuid,
  activeFile,
  currentFolder,
  isAtWorkspaceRoot = false,
  loadShareSuggestions,
}: ShareDialogProps) {
  const [shareEmail, setShareEmail] = useState("");
  const [shareSuggestions, setShareSuggestions] = useState<ShareSuggestion[]>(
    []
  );
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [fileSharePermission, setFileSharePermission] = useState<
    "viewer" | "editor"
  >("viewer");
  const [workspaceShareEmail, setWorkspaceShareEmail] = useState("");
  const [workspaceShareSuggestions, setWorkspaceShareSuggestions] = useState<
    ShareSuggestion[]
  >([]);
  const [workspaceShareBusy, setWorkspaceShareBusy] = useState(false);
  const [workspaceShareStatus, setWorkspaceShareStatus] = useState<
    string | null
  >(null);
  const [workspaceInviteRole, setWorkspaceInviteRole] = useState<
    "admin" | "member"
  >("member");
  const [workspaceMembers, setWorkspaceMembers] = useState<
    Array<{
      avatar?: string | null;
      email: string | null;
      name: string | null;
      role: string;
      userId: string | null;
    }>
  >([]);
  const [workspaceMembersLoading, setWorkspaceMembersLoading] = useState(false);
  const [folderShareEmail, setFolderShareEmail] = useState("");
  const [folderShareSuggestions, setFolderShareSuggestions] = useState<
    ShareSuggestion[]
  >([]);
  const [folderShareBusy, setFolderShareBusy] = useState(false);
  const [folderShareLink, setFolderShareLink] = useState<string | null>(null);
  const [folderShareStatus, setFolderShareStatus] = useState<string | null>(
    null
  );
  const [folderSharePermission, setFolderSharePermission] = useState<
    "viewer" | "editor"
  >("viewer");

  const getInitials = (value: string) =>
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U";

  useEffect(() => {
    if (variant !== "file" || !workspaceUuid) {
      setShareSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      void loadShareSuggestions(shareEmail, setShareSuggestions);
    }, 150);
    return () => clearTimeout(timer);
  }, [loadShareSuggestions, shareEmail, variant, workspaceUuid]);

  useEffect(() => {
    if (variant !== "folder" || !workspaceUuid) {
      setWorkspaceShareSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      void loadShareSuggestions(
        workspaceShareEmail,
        setWorkspaceShareSuggestions
      );
    }, 150);
    return () => clearTimeout(timer);
  }, [loadShareSuggestions, workspaceShareEmail, variant, workspaceUuid]);

  useEffect(() => {
    if (variant !== "folder" || !workspaceUuid || isAtWorkspaceRoot) {
      setFolderShareSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      void loadShareSuggestions(folderShareEmail, setFolderShareSuggestions);
    }, 150);
    return () => clearTimeout(timer);
  }, [
    folderShareEmail,
    isAtWorkspaceRoot,
    loadShareSuggestions,
    variant,
    workspaceUuid,
  ]);

  const shareActiveFileWithEmail = async () => {
    if (
      variant !== "file" ||
      !(activeFile && workspaceUuid && shareEmail.trim()) ||
      activeFile.readOnly
    ) {
      return;
    }

    setShareBusy(true);
    setShareStatus(null);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceUuid}/files/${activeFile.id}/share/grants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: shareEmail.trim(),
            permission: fileSharePermission,
          }),
        }
      );
      if (!response.ok) {
        setShareStatus("Unable to add access.");
        return;
      }
      setShareEmail("");
      setShareStatus("Access granted.");
    } finally {
      setShareBusy(false);
    }
  };

  const generateActiveFileShareLink = async () => {
    if (
      variant !== "file" ||
      !(activeFile && workspaceUuid) ||
      activeFile.readOnly
    ) {
      return;
    }
    setShareBusy(true);
    setShareStatus(null);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceUuid}/files/${activeFile.id}/share/link`,
        { method: "POST" }
      );
      if (!response.ok) {
        setShareStatus("Unable to generate link.");
        return;
      }
      const payload = (await response.json()) as { shareUrl?: string };
      if (payload.shareUrl) {
        setShareLink(payload.shareUrl);
        setShareStatus("Share link generated.");
      }
    } finally {
      setShareBusy(false);
    }
  };

  const shareCurrentFolderWithEmail = async () => {
    if (
      variant !== "folder" ||
      !(
        currentFolder &&
        workspaceUuid &&
        folderShareEmail.trim() &&
        !isAtWorkspaceRoot
      ) ||
      currentFolder.readOnly
    ) {
      return;
    }

    setFolderShareBusy(true);
    setFolderShareStatus(null);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceUuid}/folders/${currentFolder.id}/share/grants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: folderShareEmail.trim(),
            permission: folderSharePermission,
          }),
        }
      );
      if (!response.ok) {
        setFolderShareStatus("Unable to add access.");
        return;
      }
      const payload = (await response.json()) as { shareUrl?: string };
      setFolderShareEmail("");
      setFolderShareLink(payload.shareUrl ?? null);
      setFolderShareStatus("Access granted.");
    } finally {
      setFolderShareBusy(false);
    }
  };

  const generateCurrentFolderShareLink = async () => {
    if (
      variant !== "folder" ||
      !(currentFolder && workspaceUuid) ||
      isAtWorkspaceRoot ||
      currentFolder.readOnly
    ) {
      return;
    }
    setFolderShareBusy(true);
    setFolderShareStatus(null);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceUuid}/folders/${currentFolder.id}/share/link`,
        { method: "POST" }
      );
      if (!response.ok) {
        setFolderShareStatus("Unable to generate link.");
        return;
      }
      const payload = (await response.json()) as { shareUrl?: string };
      if (payload.shareUrl) {
        setFolderShareLink(payload.shareUrl);
        setFolderShareStatus("Share link generated.");
      }
    } finally {
      setFolderShareBusy(false);
    }
  };

  const shareWorkspaceWithEmail = async () => {
    if (
      variant !== "folder" ||
      !(workspaceUuid && workspaceShareEmail.trim())
    ) {
      return;
    }
    setWorkspaceShareBusy(true);
    setWorkspaceShareStatus(null);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceUuid}/share/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: workspaceShareEmail.trim(),
            role: workspaceInviteRole,
          }),
        }
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setWorkspaceShareStatus(payload.error ?? "Unable to share workspace.");
        return;
      }
      const payload = (await response.json()) as { status?: string };
      setWorkspaceShareEmail("");
      setWorkspaceShareStatus(
        payload.status === "added"
          ? `${workspaceInviteRole === "admin" ? "Admin" : "Member"} added.`
          : payload.status === "invited"
            ? `${workspaceInviteRole === "admin" ? "Admin" : "Member"} invitation sent.`
            : payload.status === "updated"
              ? `${workspaceInviteRole === "admin" ? "Admin" : "Member"} updated.`
              : "Workspace shared."
      );
      void loadWorkspaceMembers();
    } finally {
      setWorkspaceShareBusy(false);
    }
  };

  const loadWorkspaceMembers = useCallback(async () => {
    if (variant !== "folder" || !workspaceUuid || !isAtWorkspaceRoot) {
      return;
    }

    setWorkspaceMembersLoading(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceUuid}/share/members`,
        {
          cache: "no-store",
        }
      );
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        members?: Array<{
          avatar?: string | null;
          email: string | null;
          name: string | null;
          role: string;
          userId: string | null;
        }>;
      };
      setWorkspaceMembers(payload.members ?? []);
    } finally {
      setWorkspaceMembersLoading(false);
    }
  }, [isAtWorkspaceRoot, variant, workspaceUuid]);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange?.(nextOpen);
  };

  useEffect(() => {
    if (open && variant === "folder" && isAtWorkspaceRoot) {
      void loadWorkspaceMembers();
    }
  }, [isAtWorkspaceRoot, loadWorkspaceMembers, open, variant]);

  const notifyWorkspaceTeam = async () => {
    if (variant !== "folder" || !workspaceUuid) {
      return;
    }
    setWorkspaceShareBusy(true);
    setWorkspaceShareStatus(null);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceUuid}/share/team`,
        {
          method: "POST",
        }
      );
      if (!response.ok) {
        setWorkspaceShareStatus("Unable to notify team.");
        return;
      }
      const payload = (await response.json()) as {
        emailSentCount?: number;
        queued?: boolean;
        recipients?: number;
      };
      if (payload.queued) {
        setWorkspaceShareStatus(
          `Workspace notifications queued for ${payload.recipients ?? 0} teammates.`
        );
        return;
      }
      setWorkspaceShareStatus(
        `Workspace notification sent to ${payload.emailSentCount ?? 0} teammates.`
      );
    } finally {
      setWorkspaceShareBusy(false);
    }
  };

  if (variant === "file") {
    if (!activeFile || activeFile.readOnly) {
      return null;
    }

    return (
      <Dialog onOpenChange={handleDialogOpenChange} open={open}>
        {hideTrigger ? null : (
          <DialogTrigger
            render={
              <Button
                className={
                  segmented
                    ? "h-9 w-9 rounded-none border-0 bg-transparent shadow-none"
                    : compact
                      ? "h-7 w-7"
                      : "size-5"
                }
                size="icon-xs"
                type="button"
                variant={segmented ? "ghost" : "ghost"}
              />
            }
          >
            <Share2 className="size-3" />
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share file</DialogTitle>
            <DialogDescription>
              Grant viewer or editor access by email, or create a signed link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="file-share-email">Add people</Label>
                <EmailSuggestionInput
                  id="file-share-email"
                  onFocus={() => {
                    void loadShareSuggestions(shareEmail, setShareSuggestions);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") {
                      return;
                    }
                    event.preventDefault();
                    shareActiveFileWithEmail().catch(() => undefined);
                  }}
                  onValueChange={setShareEmail}
                  placeholder="Add people, groups, or emails..."
                  suggestions={shareSuggestions}
                  value={shareEmail}
                />
              </div>
              <select
                className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm"
                id="file-share-permission"
                onChange={(event) =>
                  setFileSharePermission(
                    event.target.value === "editor" ? "editor" : "viewer"
                  )
                }
                value={fileSharePermission}
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <Button
                disabled={shareBusy}
                onClick={() => {
                  shareActiveFileWithEmail().catch(() => undefined);
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                Add
              </Button>
            </div>
            <div className="rounded-lg border border-border/60 bg-background p-3">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground/[0.06] text-muted-foreground">
                  <Share2 className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">Anyone with the link</span>
                    <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                      Can {fileSharePermission === "editor" ? "edit" : "view"}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground text-xs">
                    Signed link access expires after 7 days.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
              <Input
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                readOnly
                value={shareLink ?? ""}
              />
              <Button
                disabled={shareBusy}
                onClick={() => {
                  void generateActiveFileShareLink();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Generate
              </Button>
              <Button
                disabled={!shareLink}
                onClick={() => {
                  if (!shareLink) {
                    return;
                  }
                  navigator.clipboard.writeText(shareLink).catch(() => {
                    setShareStatus("Unable to copy link.");
                  });
                  setShareStatus("Link copied.");
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                Copy
              </Button>
            </div>
          </div>
          {shareStatus ? (
            <p className="text-muted-foreground text-xs">{shareStatus}</p>
          ) : null}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog onOpenChange={handleDialogOpenChange} open={open}>
      {hideTrigger ? null : (
        <DialogTrigger
          render={
            <Button
              className={
                segmented
                  ? "h-9 rounded-none border-0 bg-transparent px-3 text-xs shadow-none"
                  : compact
                    ? "h-7 gap-1.5 rounded-md px-2 text-xs"
                    : "rounded-md"
              }
              size="sm"
              type="button"
              variant="outline"
            />
          }
        >
          <Share2 className={compact ? "size-3" : "size-3.5"} />
          Share
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isAtWorkspaceRoot ? "Share workspace" : "Share folder"}
          </DialogTitle>
          <DialogDescription>
            {isAtWorkspaceRoot
              ? "Add a teammate by email, or notify the whole team with a workspace link."
              : "Grant viewer or editor access by email, or create a signed folder link."}
          </DialogDescription>
        </DialogHeader>
        {isAtWorkspaceRoot ? null : (
          <div className="space-y-2">
            <Label htmlFor="folder-share-permission">Permission</Label>
            <select
              className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
              id="folder-share-permission"
              onChange={(event) =>
                setFolderSharePermission(
                  event.target.value === "editor" ? "editor" : "viewer"
                )
              }
              value={folderSharePermission}
            >
              <option value="viewer">Viewer (read-only)</option>
              <option value="editor">Editor</option>
            </select>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="workspace-share-email">
            {isAtWorkspaceRoot ? "Invite teammates" : "Add people"}
          </Label>
          <div className="rounded-lg border border-border/60 bg-background p-3">
            <div className="flex items-center gap-2">
              <EmailSuggestionInput
                id="workspace-share-email"
                onFocus={() => {
                  void loadShareSuggestions(
                    isAtWorkspaceRoot ? workspaceShareEmail : folderShareEmail,
                    isAtWorkspaceRoot
                      ? setWorkspaceShareSuggestions
                      : setFolderShareSuggestions
                  );
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") {
                    return;
                  }
                  event.preventDefault();
                  if (isAtWorkspaceRoot) {
                    shareWorkspaceWithEmail().catch(() => undefined);
                    return;
                  }
                  shareCurrentFolderWithEmail().catch(() => undefined);
                }}
                onValueChange={
                  isAtWorkspaceRoot
                    ? setWorkspaceShareEmail
                    : setFolderShareEmail
                }
                placeholder={
                  isAtWorkspaceRoot
                    ? "Add people, groups, or emails..."
                    : "name@example.com"
                }
                suggestions={
                  isAtWorkspaceRoot
                    ? workspaceShareSuggestions
                    : folderShareSuggestions
                }
                value={
                  isAtWorkspaceRoot ? workspaceShareEmail : folderShareEmail
                }
              />
              {isAtWorkspaceRoot ? (
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
              ) : null}
              <Button
                disabled={
                  isAtWorkspaceRoot ? workspaceShareBusy : folderShareBusy
                }
                onClick={() => {
                  if (isAtWorkspaceRoot) {
                    shareWorkspaceWithEmail().catch(() => undefined);
                    return;
                  }
                  shareCurrentFolderWithEmail().catch(() => undefined);
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                Add
              </Button>
            </div>
          </div>
        </div>
        {isAtWorkspaceRoot ? null : (
          <div className="space-y-2">
            <Label>Share link (7 days)</Label>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
              <Input
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                readOnly
                value={folderShareLink ?? ""}
              />
              <Button
                disabled={folderShareBusy}
                onClick={() => {
                  void generateCurrentFolderShareLink();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Generate
              </Button>
              <Button
                disabled={!folderShareLink}
                onClick={() => {
                  if (!folderShareLink) {
                    return;
                  }
                  navigator.clipboard.writeText(folderShareLink).catch(() => {
                    setFolderShareStatus("Unable to copy link.");
                  });
                  setFolderShareStatus("Link copied.");
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                Copy
              </Button>
            </div>
          </div>
        )}
        {isAtWorkspaceRoot ? (
          <div className="space-y-2">
            <Label>People with access</Label>
            <div className="rounded-lg border border-border/60 bg-background">
              {workspaceMembersLoading ? (
                <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                  Loading workspace members...
                </div>
              ) : workspaceMembers.length === 0 ? (
                <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                  No members found for this workspace yet.
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
                            {member.email ??
                              member.userId ??
                              "No email available"}
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
        ) : null}
        <DialogFooter>
          {isAtWorkspaceRoot ? (
            <Button
              disabled={workspaceShareBusy}
              onClick={() => {
                void notifyWorkspaceTeam();
              }}
              type="button"
              variant="outline"
            >
              Notify whole team
            </Button>
          ) : null}
        </DialogFooter>
        {isAtWorkspaceRoot && workspaceShareStatus ? (
          <p className="text-muted-foreground text-xs">
            {workspaceShareStatus}
          </p>
        ) : null}
        {!isAtWorkspaceRoot && folderShareStatus ? (
          <p className="text-muted-foreground text-xs">{folderShareStatus}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
