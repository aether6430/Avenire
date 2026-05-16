"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { type ChangeEvent, useRef, useState } from "react";
import type {
  OnboardingMemory,
  UploadPhase,
} from "@/components/dashboard/onboarding-modal-model";
import { getUploadErrorMessage } from "@/lib/upload";
import { requestUploadPreflight } from "@/lib/upload-preflight";
import { useUploadThing } from "@/lib/uploadthing";

export function useOnboardingUpload({
  rootFolderId,
  router,
  setMemory,
  workspaceUuid,
}: {
  rootFolderId: string;
  router: AppRouterInstance;
  setMemory: React.Dispatch<React.SetStateAction<OnboardingMemory>>;
  workspaceUuid: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");

  const { startUpload } = useUploadThing("fileExplorerUploader", {
    onUploadError: () => {
      setUploadPhase("failed");
      setUploadMessage("Upload failed. Try another PDF.");
    },
  });

  const pickUpload = () => {
    setUploadPhase("picking");
    fileInputRef.current?.click();
  };

  const registerUpload = async (
    file: File,
    uploaded: {
      contentType?: string;
      key?: string;
      name?: string;
      size?: number;
      ufsUrl?: string;
    }
  ) => {
    if (!(workspaceUuid && rootFolderId && uploaded.key && uploaded.ufsUrl)) {
      throw new Error("Upload metadata is incomplete.");
    }

    const response = await fetch(
      `/api/workspaces/${workspaceUuid}/files/register`,
      {
        body: JSON.stringify({
          folderId: rootFolderId,
          metadata: { source: "onboarding" },
          mimeType: uploaded.contentType ?? file.type ?? null,
          name: uploaded.name ?? file.name,
          sizeBytes: uploaded.size ?? file.size,
          storageKey: uploaded.key,
          storageUrl: uploaded.ufsUrl,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(payload.error ?? "Unable to register uploaded file.");
    }
  };

  const handleUploadSelection = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      setUploadPhase("idle");
      return;
    }

    setUploadName(file.name);
    setUploadMessage("Preparing the upload.");
    setUploadPhase("uploading");

    try {
      if (workspaceUuid && rootFolderId) {
        await requestUploadPreflight({
          file,
          folderId: rootFolderId,
          workspaceUuid,
        });
      }

      const uploadedResults = (await startUpload([file])) ?? [];
      const uploaded = uploadedResults[0];
      if (!uploaded) {
        throw new Error("Upload returned no storage payload.");
      }

      setUploadMessage("Registering the file in your workspace.");
      await registerUpload(file, uploaded);
      setUploadPhase("done");
      setUploadMessage("Uploaded and queued for ingestion.");
      setMemory((current) => ({
        ...current,
        uploadAt: new Date().toISOString(),
        uploadFileName: uploaded.name ?? file.name,
      }));
      setTimeout(() => {
        router.refresh();
      }, 600);
    } catch (error) {
      setUploadPhase("failed");
      setUploadMessage(getUploadErrorMessage(error));
    }
  };

  return {
    fileInputRef,
    handleUploadSelection,
    pickUpload,
    uploadMessage,
    uploadName,
    uploadPhase,
  };
}
