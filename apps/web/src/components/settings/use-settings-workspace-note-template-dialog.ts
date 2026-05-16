"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import type { NoteTemplate } from "@/lib/note-templates";
import { DEFAULT_NOTE_TEMPLATE } from "@/lib/note-templates";
import { getUploadErrorMessage } from "@/lib/upload";
import { useUploadThing } from "@/lib/uploadthing";

export function useSettingsWorkspaceNoteTemplateDialog({
  initialTemplate,
}: {
  initialTemplate?: NoteTemplate | null;
}) {
  const [noteTemplateDraft, setNoteTemplateDraft] = useState<NoteTemplate>(
    () =>
      initialTemplate ?? {
        ...DEFAULT_NOTE_TEMPLATE,
        id: "",
      }
  );
  const [noteTemplateEditorKey, setNoteTemplateEditorKey] = useState(0);
  const [noteTemplateBannerUrl, setNoteTemplateBannerUrl] = useState(
    () => initialTemplate?.bannerUrl ?? ""
  );
  const [noteTemplateBannerStatus, setNoteTemplateBannerStatus] = useState<
    string | null
  >(null);
  const [noteTemplateBannerUploading, setNoteTemplateBannerUploading] =
    useState(false);
  const noteTemplateBannerInputRef = useRef<HTMLInputElement | null>(null);
  const noteTemplateEditorScrollRef = useRef<HTMLDivElement | null>(null);
  const { startUpload: startImageUpload } = useUploadThing("imageUploader");

  useEffect(() => {
    setNoteTemplateDraft(
      initialTemplate ?? {
        ...DEFAULT_NOTE_TEMPLATE,
        id: "",
      }
    );
    setNoteTemplateBannerUrl(initialTemplate?.bannerUrl ?? "");
    setNoteTemplateBannerStatus(null);
    setNoteTemplateEditorKey((current) => current + 1);
  }, [initialTemplate]);

  const handleNoteTemplateBannerFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setNoteTemplateBannerUploading(true);
    setNoteTemplateBannerStatus("Uploading banner...");

    try {
      const uploaded = ((await startImageUpload([file])) ?? [])[0] as
        | { ufsUrl?: string | null; url?: string | null }
        | undefined;
      const uploadedUrl = uploaded?.ufsUrl ?? uploaded?.url ?? null;

      if (!uploadedUrl) {
        setNoteTemplateBannerStatus("Unable to upload banner.");
        return;
      }

      setNoteTemplateBannerUrl(uploadedUrl);
      setNoteTemplateBannerStatus("Banner uploaded.");
    } catch (error) {
      setNoteTemplateBannerStatus(getUploadErrorMessage(error));
    } finally {
      setNoteTemplateBannerUploading(false);
    }
  };

  return {
    handleNoteTemplateBannerFileChange,
    noteTemplateBannerInputRef,
    noteTemplateBannerStatus,
    noteTemplateBannerUploading,
    noteTemplateBannerUrl,
    noteTemplateDraft,
    noteTemplateEditorKey,
    noteTemplateEditorScrollRef,
    setNoteTemplateBannerStatus,
    setNoteTemplateBannerUrl,
    setNoteTemplateDraft,
  };
}
