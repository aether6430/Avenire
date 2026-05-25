"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  type Attachment,
  createLocalAttachment,
  revokeAttachmentUrl,
} from "@/components/chat/attachment";
import { getUploadErrorMessage } from "@/lib/upload-error-message";
import { useUploadThing } from "@/lib/uploadthing";

export function useMultimodalInputAttachments({
  attachments,
  maxFiles,
  setAttachments,
}: {
  attachments: Attachment[];
  maxFiles: number;
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingIdsRef = useRef(new Set<string>());

  const { startUpload } = useUploadThing("chatAttachmentUploader", {
    onUploadError: (error) => {
      toast.error(getUploadErrorMessage(error));
    },
  });

  const submittableAttachments = useMemo(
    () => attachments.filter((attachment) => attachment.status !== "failed"),
    [attachments]
  );

  const updateAttachment = useCallback(
    (id: string, update: Partial<Attachment>) => {
      setAttachments((prev) =>
        prev.map((attachment) =>
          attachment.id === id ? { ...attachment, ...update } : attachment
        )
      );
    },
    [setAttachments]
  );

  const uploadAttachment = useCallback(
    async (attachment: Attachment) => {
      if (!attachment.file) {
        return;
      }

      try {
        updateAttachment(attachment.id, {
          errorMessage: undefined,
          status: "uploading",
        });

        const uploadedFiles = await startUpload([attachment.file]);
        const uploaded = uploadedFiles?.[0];
        if (!uploaded) {
          throw new Error("Missing uploaded file metadata");
        }

        const uploadedUrl = "ufsUrl" in uploaded ? uploaded.ufsUrl : undefined;
        if (!uploadedUrl) {
          throw new Error("Upload returned no URL");
        }

        revokeAttachmentUrl(attachment.url);
        updateAttachment(attachment.id, {
          status: "completed",
          storageKey: "key" in uploaded ? uploaded.key : undefined,
          url: uploadedUrl,
        });
      } catch (error) {
        updateAttachment(attachment.id, {
          errorMessage: getUploadErrorMessage(error),
          status: "failed",
        });
      }
    },
    [startUpload, updateAttachment]
  );

  useEffect(() => {
    const pending = attachments.filter(
      (attachment) =>
        attachment.status === "pending" &&
        Boolean(attachment.file) &&
        !uploadingIdsRef.current.has(attachment.id)
    );
    if (pending.length === 0) {
      return;
    }

    for (const attachment of pending) {
      uploadingIdsRef.current.add(attachment.id);
    }

    const processPendingUploads = async () => {
      for (const attachment of pending) {
        await uploadAttachment(attachment);
        uploadingIdsRef.current.delete(attachment.id);
      }
    };

    processPendingUploads().catch(() => undefined);
  }, [attachments, uploadAttachment]);

  const enqueueFiles = useCallback(
    (incomingFiles: File[]) => {
      if (incomingFiles.length === 0) {
        return;
      }

      if (attachments.length + incomingFiles.length > maxFiles) {
        toast.error("File limit exceeded", {
          description: `You can only upload up to ${maxFiles} files per message.`,
          duration: 3000,
        });
        return;
      }

      const nextAttachments = incomingFiles.map(createLocalAttachment);
      setAttachments((prev) => [...prev, ...nextAttachments]);
    },
    [attachments.length, maxFiles, setAttachments]
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      enqueueFiles(Array.from(event.target.files ?? []));
      event.target.value = "";
    },
    [enqueueFiles]
  );

  const removeAttachment = useCallback(
    (attachmentId: string) => {
      setAttachments((prev) => {
        const selected = prev.find(
          (attachment) => attachment.id === attachmentId
        );
        if (!selected) {
          return prev;
        }
        revokeAttachmentUrl(selected.url);
        return prev.filter((attachment) => attachment.id !== attachmentId);
      });
    },
    [setAttachments]
  );

  return {
    enqueueFiles,
    fileInputRef,
    handleFileChange,
    removeAttachment,
    submittableAttachments,
  };
}
