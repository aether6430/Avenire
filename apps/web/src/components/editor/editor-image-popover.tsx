"use client";

import { Button } from "@avenire/ui/components/button";
import { Input } from "@avenire/ui/components/input";
import { Spinner } from "@avenire/ui/components/spinner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@avenire/ui/components/tabs";
import type { Editor } from "@tiptap/react";
import type { RefObject } from "react";
import { useRef } from "react";
import type {
  ImagePickerTab,
  ImagePopoverState,
} from "@/components/editor/editor-core";
import {
  useAnchoredPopoverStyle,
  usePopoverOutsideDismiss,
} from "@/components/editor/editor-popover-positioning";

export function ImagePopover({
  editor,
  value,
  onChange,
  onTabChange,
  onUpload,
  uploadBusy,
  uploadError,
  onSave,
  onCancel,
  scrollContainerRef,
}: {
  editor: Editor;
  value: ImagePopoverState | null;
  onChange: (next: string) => void;
  onTabChange: (next: ImagePickerTab) => void;
  onUpload: (file: File) => Promise<void>;
  uploadBusy: boolean;
  uploadError: string | null;
  onSave: () => void;
  onCancel: () => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const style = useAnchoredPopoverStyle({
    editor,
    popoverRef,
    pos: value?.pos ?? null,
    scrollContainerRef,
  });

  usePopoverOutsideDismiss({
    enabled: Boolean(value),
    onCancel,
    popoverRef,
    shouldIgnoreTarget: (target) => Boolean(target.closest("img")),
  });

  if (!value) {
    return null;
  }

  return (
    <Tabs
      className="w-full gap-0"
      onValueChange={(next) => onTabChange(next as ImagePickerTab)}
      value={value.tab}
    >
      <div
        className="fixed z-[90] w-[min(36rem,calc(100vw-1.25rem))] rounded-lg border border-border/60 bg-popover p-0 shadow-black/10 shadow-lg"
        ref={popoverRef}
        style={style ?? undefined}
      >
        <div className="flex items-center justify-between border-border/60 border-b px-3 py-2">
          <TabsList className="h-8 gap-1 p-0" variant="line">
            <TabsTrigger className="rounded-none px-2.5 text-xs" value="upload">
              Upload
            </TabsTrigger>
            <TabsTrigger className="rounded-none px-2.5 text-xs" value="link">
              Link
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent className="space-y-3 p-3" value="upload">
          <input
            accept="image/*"
            className="hidden"
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!file) {
                return;
              }
              await onUpload(file);
            }}
            ref={uploadInputRef}
            type="file"
          />
          <div className="flex min-h-36 items-center justify-center rounded-md border border-border/70 border-dashed bg-muted/20 px-4 text-center">
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">
                Upload from your device and insert the hosted image URL.
              </p>
              <Button
                className="h-8 rounded-md px-3 text-xs"
                disabled={uploadBusy}
                onClick={() => uploadInputRef.current?.click()}
                onMouseDown={(event) => event.preventDefault()}
                size="sm"
                type="button"
                variant="secondary"
              >
                {uploadBusy ? (
                  <>
                    <Spinner className="mr-2 size-3.5" />
                    Uploading...
                  </>
                ) : (
                  "Choose image"
                )}
              </Button>
              {uploadError ? (
                <p className="text-destructive text-xs">{uploadError}</p>
              ) : null}
            </div>
          </div>
        </TabsContent>
        <TabsContent className="space-y-3 p-3" value="link">
          <Input
            className="h-8 text-xs"
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                onSave();
              } else if (event.key === "Escape") {
                event.preventDefault();
                onCancel();
              }
            }}
            placeholder="https://example.com/image.png"
            value={value.src}
          />
          <div className="flex justify-end gap-2">
            <Button
              onClick={onCancel}
              onMouseDown={(event) => event.preventDefault()}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              onMouseDown={(event) => event.preventDefault()}
              size="sm"
              type="button"
            >
              Insert
            </Button>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}
