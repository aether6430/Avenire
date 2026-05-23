"use client";

import { Card, CardContent } from "@avenire/ui/components/card";
import { Checkbox } from "@avenire/ui/components/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@avenire/ui/components/context-menu";
import { cn } from "@avenire/ui/lib/utils";
import {
  ArrowRight,
  Copy,
  FolderPlus as FolderInput,
  Info,
  Pencil,
  ArrowCounterClockwise as RotateCcw,
  ShareNetwork as Share2,
  Trash as Trash2,
} from "@phosphor-icons/react";
import { DownloadSimple as ArrowDownToLine } from "@phosphor-icons/react/DownloadSimple";
import dynamic from "next/dynamic";
import Image from "next/image";
import type {
  ExplorerCardFileType,
  SelectionControlCaptureProps,
} from "@/components/files/explorer/explorer-cards-shared";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import { getWarmState, isFileOpenedCached } from "@/lib/file-preview-cache";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";
import { buildVideoPlaybackDescriptor } from "@/lib/media-playback";
import { FileCard } from "../file-card";
import { buildExplorerFileCardModel } from "./explorer-file-card-model";

const VideoThumbnail = dynamic(
  () =>
    import("@/components/files/video-thumbnail").then(
      (module) => module.VideoThumbnail
    ),
  { loading: () => null, ssr: false }
);

const PdfThumbnail = dynamic(
  () =>
    import("@/components/files/pdf-thumbnail").then(
      (module) => module.PdfThumbnail
    ),
  { loading: () => null, ssr: false }
);

const MarkdownThumbnail = dynamic(
  () =>
    import("@/components/files/markdown-thumbnail").then(
      (module) => module.MarkdownThumbnail
    ),
  { loading: () => null, ssr: false }
);

interface ExplorerFileCardProps {
  allFolders: FolderRecord[];
  contextMenuSurfaceClass: string;
  displayName: string;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
  file: FileRecord;
  fileType: ExplorerCardFileType;
  isMobile: boolean;
  isPreviewing: boolean;
  isSearchFilteredView: boolean;
  isSelected: boolean;
  onBlur: React.FocusEventHandler<HTMLDivElement>;
  onClick: React.MouseEventHandler<HTMLDivElement>;
  onContextMenu: React.MouseEventHandler<HTMLDivElement>;
  onDelete: () => void;
  onDownload: () => void;
  onDuplicate: () => void;
  onFocus: React.FocusEventHandler<HTMLDivElement>;
  onHardReingest: () => void;
  onMouseEnter: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave: React.MouseEventHandler<HTMLDivElement>;
  onMoveToFolder: (targetId: string) => void;
  onOpen: () => void;
  onOpenProperties: () => void;
  onPointerCancel: React.PointerEventHandler<HTMLDivElement>;
  onPointerDown: React.PointerEventHandler<HTMLDivElement>;
  onPointerUp: React.PointerEventHandler<HTMLDivElement>;
  onRename: () => void;
  onShare: () => void;
  onToggleSelected: (checked: boolean) => void;
  rowRef: (node: HTMLDivElement | null) => void;
  searchMatchMeta?: string;
  searchMatchSnippet?: string;
  selectedCardPropertyDefinitions: WorkspacePropertyDefinition[];
  selectionControlCaptureProps: SelectionControlCaptureProps;
}

export function ExplorerFileCard({
  allFolders,
  contextMenuSurfaceClass,
  displayName,
  dragProps,
  file,
  fileType,
  isMobile,
  isPreviewing,
  isSearchFilteredView,
  isSelected,
  onBlur,
  onClick,
  onContextMenu,
  onDelete,
  onDownload,
  onDuplicate,
  onFocus,
  onHardReingest,
  onMouseEnter,
  onMouseLeave,
  onMoveToFolder,
  onOpen,
  onOpenProperties,
  onPointerCancel,
  onPointerDown,
  onPointerUp,
  onRename,
  onShare,
  searchMatchMeta,
  searchMatchSnippet,
  onToggleSelected,
  rowRef,
  selectedCardPropertyDefinitions,
  selectionControlCaptureProps,
}: ExplorerFileCardProps) {
  const videoPlaybackDescriptor = buildVideoPlaybackDescriptor({
    fallbackUrl: file.storageUrl,
    mimeType: file.mimeType,
    videoDelivery: file.videoDelivery,
  });
  const openedCached = isFileOpenedCached(file.id);
  const warmStateSource =
    videoPlaybackDescriptor?.preferredSource ?? file.storageUrl;
  const isWarmed = getWarmState(warmStateSource) === "warm";
  const model = buildExplorerFileCardModel({
    displayName,
    file,
    fileType,
    isPreviewing,
    isWarmed,
    matchMeta: searchMatchMeta,
    matchSnippet: searchMatchSnippet,
    openedCached,
    selectedCardPropertyDefinitions,
    variant: isSearchFilteredView ? "row" : "grid",
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger {...({ disabled: isMobile } as any)}>
        <Card
          className={cn(
            "group grid-card-item relative cursor-pointer overflow-hidden rounded-2xl border border-transparent bg-transparent p-2 ring-0 transition",
            isSearchFilteredView && "rounded-md",
            isSelected && "border border-primary bg-primary/5"
          )}
          data-select-item="true"
          onBlur={onBlur}
          onClick={onClick}
          onContextMenu={onContextMenu}
          onFocus={onFocus}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onPointerCancel={onPointerCancel}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          ref={rowRef}
          style={{
            containIntrinsicSize: "214px 160px",
            contentVisibility: "auto",
            width: isSearchFilteredView ? "100%" : 160,
          }}
          tabIndex={0}
          {...dragProps}
        >
          <div
            className="absolute top-2 left-2 z-20 rounded-md bg-background/90 p-1 shadow-sm backdrop-blur-sm"
            data-selection-control="true"
            onClickCapture={selectionControlCaptureProps.onClickCapture}
            onMouseDownCapture={selectionControlCaptureProps.onMouseDownCapture}
            onPointerDownCapture={
              selectionControlCaptureProps.onPointerDownCapture
            }
          >
            <Checkbox
              aria-label={`Select file ${file.name}`}
              checked={isSelected}
              onCheckedChange={(checked) => onToggleSelected(checked === true)}
            />
          </div>
          <CardContent className="px-0 pt-0">
            <FileCard
              details={model.details}
              fileType={model.resolvedFileType}
              lastUpdated={new Date(file.updatedAt ?? file.createdAt)}
              matchMeta={model.matchMeta}
              matchSnippet={model.matchSnippet}
              name={model.displayName}
              previewContent={
                model.preview.kind === "image" ? (
                  <Image
                    alt={model.preview.alt}
                    className="block h-full w-auto rounded-md object-contain"
                    height={168}
                    src={model.preview.src}
                    unoptimized
                    width={224}
                  />
                ) : model.preview.kind === "video" ? (
                  <VideoThumbnail
                    className="h-full w-full"
                    openedCached={model.preview.openedCached}
                    playbackSource={model.preview.playbackSource}
                    playOnHover={isPreviewing}
                    posterUrl={model.preview.posterUrl}
                    sizeBytes={model.preview.sizeBytes}
                    warm={model.preview.warm}
                  />
                ) : model.preview.kind === "markdown" ? (
                  <MarkdownThumbnail
                    className="h-full w-full"
                    content={model.preview.content}
                  />
                ) : model.preview.kind === "pdf" ? (
                  <PdfThumbnail
                    className="h-full w-full"
                    src={model.preview.src}
                  />
                ) : undefined
              }
              variant={model.variant}
            />
          </CardContent>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent className={contextMenuSurfaceClass}>
        <ContextMenuItem onClick={onOpen}>
          <ArrowRight className="size-3.5" />
          Open
        </ContextMenuItem>
        {file.readOnly ? null : (
          <>
            <ContextMenuItem onClick={onRename}>
              <Pencil className="size-3.5" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={onDuplicate}>
              <Copy className="size-3.5" />
              Duplicate
            </ContextMenuItem>
            <ContextMenuItem onClick={onShare}>
              <Share2 className="size-3.5" />
              Share
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <FolderInput className="size-3.5" />
                Move to
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className={contextMenuSurfaceClass}>
                {allFolders
                  .filter((target) => !target.readOnly)
                  .slice(0, 20)
                  .map((target) => (
                    <ContextMenuItem
                      key={target.id}
                      onClick={() => onMoveToFolder(target.id)}
                    >
                      {target.name}
                    </ContextMenuItem>
                  ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuItem onClick={onDownload}>
              <ArrowDownToLine className="size-3.5" />
              Download
            </ContextMenuItem>
            <ContextMenuItem onClick={onHardReingest}>
              <RotateCcw className="size-3.5" />
              Hard Re-ingest
            </ContextMenuItem>
          </>
        )}
        <ContextMenuItem onClick={onOpenProperties}>
          <Info className="size-3.5" />
          Properties
        </ContextMenuItem>
        {file.readOnly ? null : (
          <ContextMenuItem onClick={onDelete} variant="destructive">
            <Trash2 className="size-3.5" />
            Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
