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
import { useState } from "react";
import {
  createFolderShareLink,
  grantFolderShareAccess,
} from "@/components/files/explorer/share-dialog-client";
import type {
  FolderRecord,
  ShareSuggestion,
} from "@/components/files/explorer/shared";
import { useShareSuggestionList } from "@/components/files/explorer/use-share-suggestion-list";
import { EmailSuggestionInput } from "@/components/shared/email-suggestion-input";

interface ShareDialogFolderContentProps {
  currentFolder?: FolderRecord | null;
  loadShareSuggestions: (
    q: string,
    cb: (suggestions: ShareSuggestion[]) => void
  ) => void;
  open: boolean;
  workspaceUuid: string;
}

export function ShareDialogFolderContent({
  currentFolder,
  loadShareSuggestions,
  open,
  workspaceUuid,
}: ShareDialogFolderContentProps) {
  const [folderShareEmail, setFolderShareEmail] = useState("");
  const [folderShareBusy, setFolderShareBusy] = useState(false);
  const [folderShareLink, setFolderShareLink] = useState<string | null>(null);
  const [folderShareStatus, setFolderShareStatus] = useState<string | null>(
    null
  );
  const [folderSharePermission, setFolderSharePermission] = useState<
    "viewer" | "editor"
  >("viewer");
  const { requestSuggestions, suggestions } = useShareSuggestionList({
    enabled: open,
    loadShareSuggestions,
    query: folderShareEmail,
    workspaceUuid,
  });

  const shareCurrentFolderWithEmail = async () => {
    if (!(currentFolder && workspaceUuid && folderShareEmail.trim())) {
      return;
    }

    if (currentFolder.readOnly) {
      return;
    }

    setFolderShareBusy(true);
    setFolderShareStatus(null);
    try {
      const result = await grantFolderShareAccess({
        email: folderShareEmail.trim(),
        folderId: currentFolder.id,
        permission: folderSharePermission,
        workspaceUuid,
      });
      if (!result.ok) {
        setFolderShareStatus(result.error);
        return;
      }

      setFolderShareEmail("");
      setFolderShareLink(result.shareUrl);
      setFolderShareStatus("Folder access granted.");
    } finally {
      setFolderShareBusy(false);
    }
  };

  const generateShareLink = async () => {
    if (!(currentFolder && workspaceUuid) || currentFolder.readOnly) {
      return;
    }

    setFolderShareBusy(true);
    setFolderShareStatus(null);
    try {
      const result = await createFolderShareLink({
        folderId: currentFolder.id,
        workspaceUuid,
      });
      if (!result.ok) {
        setFolderShareStatus(result.error);
        return;
      }

      setFolderShareLink(result.shareUrl);
      setFolderShareStatus("Folder share link generated.");
    } finally {
      setFolderShareBusy(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Share folder</DialogTitle>
        <DialogDescription>
          Grant viewer or editor access by email, or create a signed folder
          link.
        </DialogDescription>
      </DialogHeader>
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
      <div className="space-y-2">
        <Label htmlFor="folder-share-email">Share with people</Label>
        <div className="rounded-lg border border-border/60 bg-background p-3">
          <div className="flex items-center gap-2">
            <EmailSuggestionInput
              id="folder-share-email"
              onFocus={requestSuggestions}
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }
                event.preventDefault();
                shareCurrentFolderWithEmail().catch(() => undefined);
              }}
              onValueChange={setFolderShareEmail}
              placeholder="name@example.com"
              suggestions={suggestions}
              value={folderShareEmail}
            />
            <Button
              disabled={folderShareBusy}
              onClick={() => {
                shareCurrentFolderWithEmail().catch(() => undefined);
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
        <Label>Folder share link (7 days)</Label>
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
          <Input
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            readOnly
            value={folderShareLink ?? ""}
          />
          <Button
            disabled={folderShareBusy}
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
            disabled={!folderShareLink}
            onClick={() => {
              if (!folderShareLink) {
                return;
              }
              navigator.clipboard.writeText(folderShareLink).catch(() => {
                setFolderShareStatus("Unable to copy folder link.");
              });
              setFolderShareStatus("Folder link copied.");
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Copy link
          </Button>
        </div>
      </div>
      {folderShareStatus ? (
        <p className="text-muted-foreground text-xs">{folderShareStatus}</p>
      ) : null}
    </DialogContent>
  );
}
