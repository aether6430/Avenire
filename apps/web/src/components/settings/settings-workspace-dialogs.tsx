"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@avenire/ui/components/dialog";
import { Input } from "@avenire/ui/components/input";
import { Camera } from "@phosphor-icons/react/Camera";
import dynamic from "next/dynamic";
import type { WorkspaceSummary } from "@/components/settings/settings-panel-model";
import type { NoteTemplate } from "@/lib/note-templates";
import {
  DEFAULT_NOTE_TEMPLATE,
  getDefaultNoteTemplates,
} from "@/lib/note-templates";
import { useSettingsWorkspaceNoteTemplateDialog } from "./use-settings-workspace-note-template-dialog";

const DeferredAvenireEditor = dynamic(() => import("@/components/editor"), {
  loading: () => (
    <div className="flex min-h-[18rem] items-center justify-center text-muted-foreground text-sm">
      Loading editor...
    </div>
  ),
  ssr: false,
});

export function SettingsWorkspaceDialogs({
  activeWorkspaceId,
  currentUserEmail,
  initialTemplate,
  onOpenChange,
  open,
  noteTemplates,
  selectedWorkspace,
  setNoteTemplates,
  session,
}: {
  activeWorkspaceId: string;
  currentUserEmail: string | null;
  initialTemplate: NoteTemplate | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  noteTemplates: NoteTemplate[];
  selectedWorkspace: WorkspaceSummary | null;
  setNoteTemplates: (
    updater: (current: NoteTemplate[]) => NoteTemplate[]
  ) => void;
  session: {
    user?: {
      email?: string | null;
      name?: string | null;
    };
  } | null;
}) {
  const dialog = useSettingsWorkspaceNoteTemplateDialog({
    initialTemplate,
  });

  const saveNoteTemplateDraft = () => {
    const trimmedName = dialog.noteTemplateDraft.name.trim();
    const trimmedContent = dialog.noteTemplateDraft.content.trim();
    if (!(trimmedName && trimmedContent)) {
      return;
    }

    const id =
      dialog.noteTemplateDraft.id.trim() ||
      globalThis.crypto?.randomUUID?.() ||
      `template-${Date.now()}`;
    const nextTemplate: NoteTemplate = {
      id,
      name: trimmedName,
      content: dialog.noteTemplateDraft.content,
      bannerUrl: dialog.noteTemplateBannerUrl.trim() || null,
    };

    setNoteTemplates((current) => {
      const existingIndex = current.findIndex((item) => item.id === id);
      if (existingIndex < 0) {
        return [...current, nextTemplate];
      }
      return current.map((item) => (item.id === id ? nextTemplate : item));
    });
    onOpenChange(false);
  };

  const deleteNoteTemplateDraft = () => {
    const id = dialog.noteTemplateDraft.id.trim();
    if (!id) {
      onOpenChange(false);
      return;
    }

    setNoteTemplates((current) => {
      const next = current.filter((template) => template.id !== id);
      return next.length > 0 ? next : getDefaultNoteTemplates();
    });
    onOpenChange(false);
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          dialog.setNoteTemplateDraft(DEFAULT_NOTE_TEMPLATE);
          dialog.setNoteTemplateBannerUrl("");
          dialog.setNoteTemplateBannerStatus(null);
        }
      }}
      open={open}
    >
      <DialogContent className="max-h-[92vh] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {dialog.noteTemplateDraft.id ? "Edit template" : "New template"}
          </DialogTitle>
          <DialogDescription>
            Templates are stored per workspace and can use note variables at
            creation time.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[calc(92vh-12rem)] gap-4 overflow-y-auto pr-1">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="template-name">
                Name
              </label>
              <Input
                id="template-name"
                onChange={(event) =>
                  dialog.setNoteTemplateDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Study note"
                value={dialog.noteTemplateDraft.name}
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="template-banner">
                Banner
              </label>
              <input
                accept="image/*"
                className="hidden"
                onChange={dialog.handleNoteTemplateBannerFileChange}
                ref={dialog.noteTemplateBannerInputRef}
                type="file"
              />
              <Input
                id="template-banner"
                onChange={(event) =>
                  dialog.setNoteTemplateBannerUrl(event.target.value)
                }
                placeholder="https://example.com/banner.png"
                value={dialog.noteTemplateBannerUrl}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={dialog.noteTemplateBannerUploading}
                  onClick={() =>
                    dialog.noteTemplateBannerInputRef.current?.click()
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {dialog.noteTemplateBannerUploading
                    ? "Uploading..."
                    : "Upload banner"}
                </Button>
                <Button
                  disabled={!dialog.noteTemplateBannerUrl.trim()}
                  onClick={() => dialog.setNoteTemplateBannerUrl("")}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Remove
                </Button>
              </div>
              {dialog.noteTemplateBannerStatus ? (
                <p className="text-muted-foreground text-xs">
                  {dialog.noteTemplateBannerStatus}
                </p>
              ) : null}
            </div>
          </div>
          {dialog.noteTemplateBannerUrl.trim() ? (
            <div
              className="h-32 overflow-hidden rounded-2xl border border-border/60 bg-muted/30"
              style={{
                backgroundImage: `url(${dialog.noteTemplateBannerUrl.trim()})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }}
            />
          ) : null}
          <div className="space-y-2">
            <p className="font-medium text-sm">Template body</p>
            <div
              className="overflow-hidden rounded-2xl border border-border/60"
              ref={dialog.noteTemplateEditorScrollRef}
            >
              <DeferredAvenireEditor
                createdBy={
                  session?.user?.name?.trim() ||
                  session?.user?.email?.trim() ||
                  currentUserEmail ||
                  ""
                }
                defaultValue={dialog.noteTemplateDraft.content}
                key={dialog.noteTemplateEditorKey}
                noteTitle={dialog.noteTemplateDraft.name || "Untitled"}
                onChange={(markdown) =>
                  dialog.setNoteTemplateDraft((current) => ({
                    ...current,
                    content: markdown,
                  }))
                }
                onTemplateApplied={(template) => {
                  dialog.setNoteTemplateBannerUrl(template.bannerUrl ?? "");
                }}
                scrollContainerRef={dialog.noteTemplateEditorScrollRef}
                wikiPages={[]}
                workspaceUuid={
                  selectedWorkspace?.workspaceId ?? activeWorkspaceId
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter className="justify-between gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                onOpenChange(false);
              }}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            {dialog.noteTemplateDraft.id ? (
              <Button
                onClick={() => {
                  deleteNoteTemplateDraft();
                }}
                type="button"
                variant="outline"
              >
                Delete
              </Button>
            ) : null}
          </div>
          <Button
            disabled={
              !(
                dialog.noteTemplateDraft.name.trim() &&
                dialog.noteTemplateDraft.content.trim()
              )
            }
            onClick={() => {
              saveNoteTemplateDraft();
            }}
            type="button"
          >
            Save template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
