"use client";

import { Button } from "@avenire/ui/components/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@avenire/ui/components/dialog";
import { Input } from "@avenire/ui/components/input";
import { Label } from "@avenire/ui/components/label";
import { ShareNetwork as Share2 } from "@phosphor-icons/react/ShareNetwork";
import { useState } from "react";
import type {
  FileRecord,
  ShareSuggestion,
} from "@/components/files/explorer/shared";
import { EmailSuggestionInput } from "@/components/shared/email-suggestion-input";
import {
  createFileShareLink,
  grantFileShareAccess,
} from "./share-dialog-client";
import { useShareSuggestionList } from "./use-share-suggestion-list";

interface ShareDialogFileContentProps {
  activeFile: FileRecord;
  loadShareSuggestions: (
    q: string,
    cb: (suggestions: ShareSuggestion[]) => void
  ) => void;
  open: boolean;
  workspaceUuid: string;
}

export function ShareDialogFileContent({
  activeFile,
  loadShareSuggestions,
  open,
  workspaceUuid,
}: ShareDialogFileContentProps) {
  const [shareEmail, setShareEmail] = useState("");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [fileSharePermission, setFileSharePermission] = useState<
    "viewer" | "editor"
  >("viewer");
  const { requestSuggestions, suggestions } = useShareSuggestionList({
    enabled: open,
    loadShareSuggestions,
    query: shareEmail,
    workspaceUuid,
  });

  const shareActiveFileWithEmail = async () => {
    if (!(workspaceUuid && shareEmail.trim()) || activeFile.readOnly) {
      return;
    }

    setShareBusy(true);
    setShareStatus(null);
    try {
      const result = await grantFileShareAccess({
        email: shareEmail.trim(),
        fileId: activeFile.id,
        permission: fileSharePermission,
        workspaceUuid,
      });
      if (!result.ok) {
        setShareStatus(result.error);
        return;
      }
      setShareEmail("");
      setShareStatus("File access granted.");
    } finally {
      setShareBusy(false);
    }
  };

  const generateShareLink = async () => {
    if (!(activeFile && workspaceUuid) || activeFile.readOnly) {
      return;
    }

    setShareBusy(true);
    setShareStatus(null);
    try {
      const result = await createFileShareLink({
        fileId: activeFile.id,
        workspaceUuid,
      });
      if (!result.ok) {
        setShareStatus(result.error);
        return;
      }
      setShareLink(result.shareUrl);
      setShareStatus("File share link generated.");
    } finally {
      setShareBusy(false);
    }
  };

  return (
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
            <Label htmlFor="file-share-email">Share with people</Label>
            <EmailSuggestionInput
              id="file-share-email"
              onFocus={requestSuggestions}
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }
                event.preventDefault();
                shareActiveFileWithEmail().catch(() => undefined);
              }}
              onValueChange={setShareEmail}
              placeholder="Emails or groups..."
              suggestions={suggestions}
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
            Grant access
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
              void generateShareLink();
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Generate link
          </Button>
          <Button
            disabled={!shareLink}
            onClick={() => {
              if (!shareLink) {
                return;
              }
              navigator.clipboard.writeText(shareLink).catch(() => {
                setShareStatus("Unable to copy file link.");
              });
              setShareStatus("File link copied.");
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Copy link
          </Button>
        </div>
      </div>
      {shareStatus ? (
        <p className="text-muted-foreground text-xs">{shareStatus}</p>
      ) : null}
    </DialogContent>
  );
}
