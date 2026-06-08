"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@avenire/ui/components/dialog";
import { SettingsPanel } from "@/components/settings/settings-panel";

export function SettingsDialog({
  open,
  onOpenChange,
  initialTab,
  initialWorkspaces,
  initialWorkspaceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?:
    | "account"
    | "preferences"
    | "workspace"
    | "data"
    | "billing"
    | "security"
    | "shortcuts";
  initialWorkspaces?: Array<{
    logo: string | null;
    workspaceId: string;
    organizationId: string;
    rootFolderId: string;
    name: string;
  }>;
  initialWorkspaceId?: string;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="!top-auto !bottom-0 !left-0 !max-w-none !translate-x-0 !translate-y-0 h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-0.75rem))] w-screen rounded-t-xl border-x-0 border-b-0 p-0 sm:!top-1/2 sm:!bottom-auto sm:!left-1/2 sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:h-[92vh] sm:w-[96vw] sm:max-w-[1200px] sm:rounded-xl sm:border lg:max-w-[1280px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <SettingsPanel
          initialTab={initialTab}
          initialWorkspaceId={initialWorkspaceId}
          initialWorkspaces={initialWorkspaces}
          tabMode="local"
        />
      </DialogContent>
    </Dialog>
  );
}
