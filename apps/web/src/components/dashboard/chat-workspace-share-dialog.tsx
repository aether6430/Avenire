"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@avenire/ui/components/dialog";
import { Input } from "@avenire/ui/components/input";
import { Label } from "@avenire/ui/components/label";
import { ShareNetwork as Share2 } from "@phosphor-icons/react";
import { LinkSimple as Link2 } from "@phosphor-icons/react/LinkSimple";
import type { ShareSuggestion } from "@/types/share";
import { EmailSuggestionInput } from "../shared/email-suggestion-input";

export function ChatWorkspaceShareDialog({
  isOpen,
  onOpenChange,
  shareBusy,
  shareEmail,
  shareLink,
  shareStatus,
  shareSuggestions,
  onCopyLink,
  onGenerateLink,
  onShareEmailChange,
  onShareWithEmail,
}: {
  isOpen: boolean;
  onCopyLink: () => void | Promise<void>;
  onGenerateLink: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  onShareEmailChange: (value: string) => void;
  onShareWithEmail: () => void | Promise<void>;
  shareBusy: boolean;
  shareEmail: string;
  shareLink: string | null;
  shareStatus: string | null;
  shareSuggestions: ShareSuggestion[];
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogTrigger
        render={
          <Button
            className="rounded-md"
            size="sm"
            type="button"
            variant="outline"
          />
        }
      >
        <Share2 className="size-3.5" />
        Share
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share method</DialogTitle>
          <DialogDescription>
            Grant read-only access to this method by email or create a signed
            link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="share-email">Share with people</Label>
          <div className="flex items-center gap-2">
            <EmailSuggestionInput
              id="share-email"
              onValueChange={onShareEmailChange}
              placeholder="name@example.com"
              suggestions={shareSuggestions}
              value={shareEmail}
            />
            <Button
              disabled={shareBusy}
              onClick={() => {
                onShareWithEmail();
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              Grant access
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Method share link (7 days)</Label>
          <div className="flex items-center gap-2">
            <Input readOnly value={shareLink ?? ""} />
            <Button
              disabled={shareBusy}
              onClick={() => {
                onGenerateLink();
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <Link2 className="size-4" />
              Generate link
            </Button>
            <Button
              disabled={!shareLink}
              onClick={() => {
                onCopyLink();
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
    </Dialog>
  );
}
