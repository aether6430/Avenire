"use client";

import {
  FileArchive,
  FileAudio as FileAudio2,
  FileCode as FileCode2,
  FileImage,
  FileXls as FileSpreadsheet,
  FileText,
  FileVideo,
} from "@phosphor-icons/react";
import Image from "next/image";
import {
  buildExplorerFileVisualDescriptor,
  type ExplorerFileKind,
} from "@/components/files/explorer/explorer-file-presentation-model";
import type { FileRecord } from "@/components/files/explorer/shared";
import { cn } from "@/lib/utils";

function getExplorerFileTypeIcon(
  fileKind: ExplorerFileKind,
  className = "size-3.5"
) {
  switch (fileKind) {
    case "image":
      return (
        <FileImage
          aria-hidden="true"
          className={cn(className, "shrink-0 text-primary")}
        />
      );
    case "video":
      return (
        <FileVideo
          aria-hidden="true"
          className={cn(className, "shrink-0 text-primary")}
        />
      );
    case "audio":
      return (
        <FileAudio2
          aria-hidden="true"
          className={cn(className, "shrink-0 text-primary")}
        />
      );
    case "sheet":
      return (
        <FileSpreadsheet
          aria-hidden="true"
          className={cn(className, "shrink-0 text-primary")}
        />
      );
    case "code":
      return (
        <FileCode2
          aria-hidden="true"
          className={cn(className, "shrink-0 text-primary")}
        />
      );
    case "archive":
      return (
        <FileArchive
          aria-hidden="true"
          className={cn(className, "shrink-0 text-primary")}
        />
      );
    default:
      return (
        <FileText
          aria-hidden="true"
          className={cn(className, "shrink-0 text-muted-foreground")}
        />
      );
  }
}

export function getExplorerFileVisualIcon(
  file: Pick<FileRecord, "page">,
  fileKind: ExplorerFileKind,
  className = "size-3.5"
) {
  const descriptor = buildExplorerFileVisualDescriptor(file, fileKind);

  if (descriptor.kind === "custom-image") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-muted",
          className
        )}
      >
        <Image
          alt=""
          className="object-cover"
          draggable={false}
          fill
          referrerPolicy="no-referrer"
          sizes="20px"
          src={descriptor.src}
          unoptimized
        />
      </span>
    );
  }

  if (descriptor.kind === "custom-glyph") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex shrink-0 items-center justify-center font-medium text-sm leading-none",
          className
        )}
      >
        {descriptor.glyph}
      </span>
    );
  }

  return getExplorerFileTypeIcon(descriptor.fileKind, className);
}
