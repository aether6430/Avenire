"use client";

import { Button } from "@avenire/ui/components/button";
import { ButtonGroup } from "@avenire/ui/components/button-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@avenire/ui/components/popover";
import { Spinner } from "@avenire/ui/components/spinner";
import { Tabs, TabsList, TabsTrigger } from "@avenire/ui/components/tabs";
import { cn } from "@avenire/ui/lib/utils";
import { FileImage, FileText } from "@phosphor-icons/react";
import { DownloadSimple as ArrowDownToLine } from "@phosphor-icons/react/DownloadSimple";
import dynamic from "next/dynamic";
import Image, { type ImageLoader } from "next/image";
import type { RefObject } from "react";
import type {
  AvenireEditorProps,
  WikiPage,
} from "@/components/editor/editor-core";
import type {
  FrontmatterProperties,
  WorkspacePropertyDefinition,
} from "@/lib/frontmatter";
import type { MarkdownCoverTab } from "./file-preview-note-shared";
import { DEFAULT_NOTE_COVER_URL } from "./file-preview-note-shared";

const passthroughImageLoader: ImageLoader = ({ src }) => src;

const AvenireEditor = dynamic(() => import("@/components/editor"), {
  loading: () => (
    <div className="mx-auto flex h-[70vh] max-w-[820px] items-center justify-center p-0 text-muted-foreground text-sm sm:p-4">
      <div className="inline-flex items-center gap-2">
        <Spinner className="size-4" />
        Loading editor...
      </div>
    </div>
  ),
  ssr: false,
});

const NOTE_COVER_GALLERY = [
  {
    label: "Default",
    url: DEFAULT_NOTE_COVER_URL,
  },
  {
    label: "Warm",
    url: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%201600%20420%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%220%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23ef5350%22/%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23f6c453%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width%3D%221600%22%20height%3D%22420%22%20fill%3D%22url(%23g)%22/%3E%3C/svg%3E",
  },
  {
    label: "Ocean",
    url: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%201600%20420%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%220%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%232f95ca%22/%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%233bb1dc%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width%3D%221600%22%20height%3D%22420%22%20fill%3D%22url(%23g)%22/%3E%3C/svg%3E",
  },
  {
    label: "Paper",
    url: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%201600%20420%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%220%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23e8d8cc%22/%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23f4ecde%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width%3D%221600%22%20height%3D%22420%22%20fill%3D%22url(%23g)%22/%3E%3C/svg%3E",
  },
  {
    label: "Mint",
    url: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%201600%20420%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%220%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%235abfc0%22/%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%2393d1c0%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width%3D%221600%22%20height%3D%22420%22%20fill%3D%22url(%23g)%22/%3E%3C/svg%3E",
  },
] as const;

export interface FilePreviewMarkdownPaneProps {
  activeFileId: string;
  activeFileIsMarkdown: boolean;
  activeFileName: string;
  editorCreatedBy: string;
  isMarkdownReady: boolean;
  markdownBody: string;
  markdownError: string | null;
  markdownLoading: boolean;
  noteBannerUploadBusy: boolean;
  noteBannerUrl: string | null;
  noteCoverLinkDraft: string;
  noteCoverPickerTab: MarkdownCoverTab;
  noteDisplayTitle: string;
  noteSaveState?: "idle" | "saving" | "saved" | "error";
  onApplyDefaultNoteCover: () => void;
  onMarkdownBodyChange: (value: string) => void;
  onNoteCoverLinkDraftChange: (value: string) => void;
  onNoteCoverPickerTabChange: (value: MarkdownCoverTab) => void;
  onOpenWikiLink: AvenireEditorProps["onOpenWikiLink"];
  onPagePropertiesChange: (properties: FrontmatterProperties) => void;
  onPropertyDefinitionsChange: (
    definitions: WorkspacePropertyDefinition[]
  ) => void;
  onSetNoteCoverUrl: (url: string | null) => void;
  onTriggerNoteBannerPicker: () => void;
  pageProperties: FrontmatterProperties;
  propertyDefinitions: WorkspacePropertyDefinition[];
  readOnly: boolean;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  wikiPages: WikiPage[];
  workspaceUuid: string;
}

export function FilePreviewMarkdownPaneSurface({
  activeFileId,
  activeFileIsMarkdown,
  activeFileName,
  editorCreatedBy,
  isMarkdownReady,
  markdownBody,
  markdownError,
  markdownLoading,
  noteBannerUploadBusy,
  noteBannerUrl,
  noteCoverLinkDraft,
  noteCoverPickerTab,
  noteDisplayTitle,
  onPagePropertiesChange,
  onPropertyDefinitionsChange,
  noteSaveState,
  onApplyDefaultNoteCover,
  onMarkdownBodyChange,
  onNoteCoverLinkDraftChange,
  onNoteCoverPickerTabChange,
  onOpenWikiLink,
  onSetNoteCoverUrl,
  onTriggerNoteBannerPicker,
  pageProperties,
  propertyDefinitions,
  readOnly,
  scrollContainerRef,
  wikiPages,
  workspaceUuid,
}: FilePreviewMarkdownPaneProps) {
  return (
    <div
      className="no-scrollbar min-h-0 flex-1 overflow-auto"
      ref={scrollContainerRef}
    >
      <div className="h-full">
        {markdownError ? (
          <div className="mx-auto flex h-[70vh] max-w-[820px] flex-col items-center justify-center gap-3 p-0 text-center sm:p-4">
            <FileText className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground text-xs">{markdownError}</p>
          </div>
        ) : markdownLoading || !isMarkdownReady ? (
          <div className="mx-auto flex h-[70vh] max-w-[820px] items-center justify-center p-0 text-muted-foreground text-sm sm:p-4">
            <div className="inline-flex items-center gap-2">
              <Spinner className="size-4" />
              Loading markdown...
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            {activeFileIsMarkdown ? (
              <div className="bg-background">
                {noteBannerUrl ? (
                  <div className="group/banner relative w-full overflow-hidden border-border/60 bg-muted/30">
                    <div className="absolute inset-0 border-border/60 sm:border-y" />
                    <Image
                      alt={`${activeFileName} cover`}
                      className="h-32 w-full object-cover sm:h-40"
                      height={160}
                      loader={passthroughImageLoader}
                      loading="lazy"
                      sizes="100vw"
                      src={noteBannerUrl}
                      unoptimized
                      width={1600}
                    />
                    <div className="pointer-events-none absolute top-3 right-3 opacity-0 transition-opacity duration-150 group-focus-within/banner:opacity-100 group-hover/banner:opacity-100">
                      <div className="pointer-events-auto">
                        <ButtonGroup className="divide-x divide-border/60 overflow-hidden rounded-md border border-border/60 bg-background/95 shadow-sm backdrop-blur-0">
                          <Popover>
                            <PopoverTrigger
                              render={
                                <Button
                                  className="h-8 rounded-none border-0 bg-transparent px-3 font-medium text-foreground text-xs shadow-none hover:bg-muted/70"
                                  size="sm"
                                  type="button"
                                  variant="ghost"
                                />
                              }
                            >
                              Change
                            </PopoverTrigger>
                            <PopoverContent
                              align="end"
                              className="w-[min(32rem,calc(100vw-1rem))] rounded-lg border border-border/60 bg-background p-0 shadow-md"
                              sideOffset={8}
                            >
                              <div className="flex items-center justify-between border-border/60 border-b px-3 py-2">
                                <Tabs
                                  onValueChange={(value) =>
                                    onNoteCoverPickerTabChange(
                                      value as MarkdownCoverTab
                                    )
                                  }
                                  value={noteCoverPickerTab}
                                >
                                  <TabsList className="h-8 rounded-none bg-transparent p-0">
                                    <TabsTrigger
                                      className="rounded-none px-2.5 text-xs data-active:border-b data-active:border-b-border"
                                      value="gallery"
                                    >
                                      Gallery
                                    </TabsTrigger>
                                    <TabsTrigger
                                      className="rounded-none px-2.5 text-xs data-active:border-b data-active:border-b-border"
                                      value="link"
                                    >
                                      Link
                                    </TabsTrigger>
                                  </TabsList>
                                </Tabs>
                                <Button
                                  className="h-7 rounded-md px-2 text-muted-foreground text-xs hover:text-destructive"
                                  disabled={!noteBannerUrl}
                                  onClick={() => onSetNoteCoverUrl(null)}
                                  size="sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  Remove
                                </Button>
                              </div>
                              <div className="p-3">
                                {noteCoverPickerTab === "gallery" ? (
                                  <div className="space-y-3">
                                    <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
                                      Color & Gradient
                                    </p>
                                    <div className="grid grid-cols-4 gap-2">
                                      {NOTE_COVER_GALLERY.map((option) => (
                                        <button
                                          className={cn(
                                            "relative h-16 overflow-hidden rounded-md border border-border/60 transition hover:opacity-90",
                                            noteBannerUrl === option.url
                                              ? "ring-1 ring-foreground/40"
                                              : ""
                                          )}
                                          key={option.label}
                                          onClick={() =>
                                            onSetNoteCoverUrl(option.url)
                                          }
                                          type="button"
                                        >
                                          <Image
                                            alt={option.label}
                                            className="h-full w-full object-cover"
                                            fill
                                            loader={passthroughImageLoader}
                                            loading="lazy"
                                            sizes="(max-width: 640px) 25vw, 120px"
                                            src={option.url}
                                            unoptimized
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                                {noteCoverPickerTab === "upload" ? (
                                  <div className="flex min-h-32 items-center justify-center rounded-md border border-border/70 border-dashed bg-muted/20">
                                    <Button
                                      className="h-8 rounded-md px-3 text-xs"
                                      disabled={noteBannerUploadBusy}
                                      onClick={onTriggerNoteBannerPicker}
                                      size="sm"
                                      type="button"
                                      variant="secondary"
                                    >
                                      {noteBannerUploadBusy
                                        ? "Uploading..."
                                        : "Upload image"}
                                    </Button>
                                  </div>
                                ) : null}
                                {noteCoverPickerTab === "link" ? (
                                  <div className="space-y-3">
                                    <input
                                      className="h-8 w-full rounded-md border border-border/60 bg-background px-2.5 text-foreground text-xs outline-none transition focus:border-foreground/30"
                                      onChange={(event) =>
                                        onNoteCoverLinkDraftChange(
                                          event.currentTarget.value
                                        )
                                      }
                                      onKeyDown={(event) => {
                                        if (event.key !== "Enter") {
                                          return;
                                        }

                                        event.preventDefault();
                                        const nextUrl =
                                          noteCoverLinkDraft.trim();
                                        if (!nextUrl) {
                                          return;
                                        }

                                        onSetNoteCoverUrl(nextUrl);
                                      }}
                                      placeholder="https://example.com/cover.png"
                                      value={noteCoverLinkDraft}
                                    />
                                    <div className="flex justify-end">
                                      <Button
                                        className="h-8 rounded-md px-3 text-xs"
                                        disabled={
                                          noteCoverLinkDraft.trim().length === 0
                                        }
                                        onClick={() =>
                                          onSetNoteCoverUrl(
                                            noteCoverLinkDraft.trim()
                                          )
                                        }
                                        size="sm"
                                        type="button"
                                      >
                                        Apply cover
                                      </Button>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button
                            className="h-8 rounded-none border-0 bg-transparent px-3 font-medium text-foreground text-xs shadow-none hover:bg-muted/70"
                            disabled={noteBannerUploadBusy}
                            onClick={onTriggerNoteBannerPicker}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            {noteBannerUploadBusy ? "Uploading..." : "Upload"}
                          </Button>
                          <Button
                            aria-label="Apply default cover"
                            className="h-8 w-8 rounded-none border-0 bg-transparent text-foreground shadow-none hover:bg-muted/70"
                            disabled={!noteBannerUrl}
                            onClick={onApplyDefaultNoteCover}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <ArrowDownToLine className="size-3.5" />
                          </Button>
                        </ButtonGroup>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-4 py-4 sm:px-8">
                  {noteBannerUrl ? null : (
                    <Button
                      className="h-7 justify-start gap-2 self-start rounded-md border-0 bg-transparent px-0 font-medium text-muted-foreground text-xs shadow-none hover:bg-transparent hover:text-foreground"
                      onClick={onApplyDefaultNoteCover}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <FileImage className="size-3.5" />
                      Add cover
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
            <AvenireEditor
              createdBy={editorCreatedBy}
              defaultValue={markdownBody}
              key={activeFileId}
              noteTitle={noteDisplayTitle}
              onChange={onMarkdownBodyChange}
              onOpenWikiLink={onOpenWikiLink}
              onPagePropertiesChange={onPagePropertiesChange}
              onPropertyDefinitionsChange={onPropertyDefinitionsChange}
              pageProperties={pageProperties}
              propertyDefinitions={propertyDefinitions}
              readOnly={readOnly}
              saveState={noteSaveState}
              scrollContainerRef={scrollContainerRef}
              wikiPages={wikiPages}
              workspaceUuid={workspaceUuid}
            />
          </div>
        )}
      </div>
    </div>
  );
}
