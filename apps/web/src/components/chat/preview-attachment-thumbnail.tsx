"use client";

import {
  FileCode as FileCode2,
  SpinnerGap as LoaderIcon,
} from "@phosphor-icons/react";
import { File } from "@phosphor-icons/react/File";
import Image from "next/image";
import type { PreviewAttachmentRuntime } from "@/components/chat/use-preview-attachment";

export function PreviewAttachmentThumbnail({
  contentType,
  name,
  playbackDescriptor,
  status,
  url,
}: {
  contentType?: string;
  name?: string;
  playbackDescriptor: PreviewAttachmentRuntime["playbackDescriptor"];
  status?: string;
  url?: string;
}) {
  if (contentType?.startsWith("image") && url) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
        <Image
          alt={name ?? "An image attachment"}
          className="h-full w-full object-cover"
          height={48}
          src={url}
          unoptimized
          width={48}
        />
        {status === "uploading" || status === "pending" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <LoaderIcon className="h-4 w-4 animate-spin text-white" />
          </div>
        ) : null}
      </div>
    );
  }

  if (contentType?.startsWith("video") && url) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
        {playbackDescriptor?.posterUrl ? (
          <Image
            alt={name ?? "A video attachment"}
            className="h-full w-full object-cover"
            height={48}
            src={playbackDescriptor.posterUrl}
            unoptimized
            width={48}
          />
        ) : (
          <video className="h-full w-full object-cover" muted src={url} />
        )}
        {status === "uploading" || status === "pending" ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/20">
            <LoaderIcon className="h-4 w-4 animate-spin text-foreground" />
          </div>
        ) : null}
      </div>
    );
  }

  if (contentType === "application/pdf") {
    return (
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-red-200 bg-red-50 font-semibold text-[10px] text-red-600">
        PDF
        {status === "uploading" || status === "pending" ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/20">
            <LoaderIcon className="h-4 w-4 animate-spin text-foreground" />
          </div>
        ) : null}
      </div>
    );
  }

  if (contentType?.startsWith("text/") || contentType?.includes("json")) {
    return (
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-green-200 bg-green-50">
        <FileCode2 className="h-5 w-5 text-green-700" />
        {status === "uploading" || status === "pending" ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/20">
            <LoaderIcon className="h-4 w-4 animate-spin text-foreground" />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-muted">
      <File className="h-6 w-6 text-muted-foreground" />
      {status === "uploading" || status === "pending" ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/20">
          <LoaderIcon className="h-4 w-4 animate-spin text-foreground" />
        </div>
      ) : null}
    </div>
  );
}

export function PreviewAttachmentPillIcon({ status }: { status?: string }) {
  const isBusy = status === "uploading" || status === "pending";

  return (
    <div className="relative flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
      <File className="h-4 w-4" />
      {isBusy ? (
        <span className="absolute -right-0.5 -bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background">
          <LoaderIcon className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
        </span>
      ) : null}
    </div>
  );
}
