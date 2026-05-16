"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import type { WorkspaceSummary } from "@/components/settings/settings-panel-model";
import { updateWorkspaceLogo } from "@/components/settings/settings-workspace-client";
import { getUploadErrorMessage } from "@/lib/upload";
import { useUploadThing } from "@/lib/uploadthing";

export function useSettingsWorkspaceIcon({
  refreshWorkspaces,
  selectedWorkspace,
}: {
  refreshWorkspaces: () => Promise<void>;
  selectedWorkspace: WorkspaceSummary | null;
}) {
  const [workspaceIconDraft, setWorkspaceIconDraft] = useState("");
  const [workspaceIconStatus, setWorkspaceIconStatus] = useState<string | null>(
    null
  );
  const [workspaceIconUploading, setWorkspaceIconUploading] = useState(false);
  const workspaceIconInputRef = useRef<HTMLInputElement | null>(null);
  const { startUpload: startImageUpload } = useUploadThing("imageUploader");

  useEffect(() => {
    setWorkspaceIconDraft(selectedWorkspace?.logo ?? "");
  }, [selectedWorkspace?.logo]);

  useEffect(() => {
    setWorkspaceIconStatus(null);
  }, []);

  const saveWorkspaceIcon = async (nextLogo?: string | null) => {
    if (!selectedWorkspace) {
      return false;
    }

    setWorkspaceIconStatus("Saving workspace icon...");

    try {
      await updateWorkspaceLogo({
        logo: nextLogo ?? (workspaceIconDraft.trim() || null),
        workspaceId: selectedWorkspace.workspaceId,
      });
      setWorkspaceIconStatus("Workspace icon updated.");
      await refreshWorkspaces();
      return true;
    } catch (error) {
      setWorkspaceIconStatus(
        error instanceof Error
          ? error.message
          : "Unable to update workspace icon."
      );
      return false;
    }
  };

  const handleWorkspaceIconFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!(file && selectedWorkspace)) {
      return;
    }

    setWorkspaceIconUploading(true);
    setWorkspaceIconStatus("Uploading workspace icon...");

    try {
      const uploaded = ((await startImageUpload([file])) ?? [])[0] as
        | { ufsUrl?: string | null; url?: string | null }
        | undefined;
      const uploadedUrl = uploaded?.ufsUrl ?? uploaded?.url ?? null;

      if (!uploadedUrl) {
        setWorkspaceIconStatus("Unable to upload workspace icon.");
        return;
      }

      setWorkspaceIconDraft(uploadedUrl);
      await saveWorkspaceIcon(uploadedUrl);
    } catch (error) {
      setWorkspaceIconStatus(getUploadErrorMessage(error));
    } finally {
      setWorkspaceIconUploading(false);
    }
  };

  return {
    handleWorkspaceIconFileChange,
    saveWorkspaceIcon,
    setWorkspaceIconDraft,
    workspaceIconDraft,
    workspaceIconInputRef,
    workspaceIconStatus,
    workspaceIconUploading,
  };
}
