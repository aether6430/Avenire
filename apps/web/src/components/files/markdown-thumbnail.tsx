"use client";

import { cn } from "@avenire/ui/lib/utils";
import { FileCode as FileCode2 } from "@phosphor-icons/react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import { buildMarkdownThumbnailSvg } from "./file-card-thumbnail-model";
import { THUMBNAIL_SURFACE_CLASS } from "./file-card-thumbnail-shared";

interface MarkdownThumbnailProps {
  className?: string;
  content?: string | null;
}

export function MarkdownThumbnail({
  className,
  content,
}: MarkdownThumbnailProps) {
  const { resolvedTheme } = useTheme();
  const markdownContent = typeof content === "string" ? content.trim() : "";
  const isDark = resolvedTheme === "dark";
  const previewSrc = useMemo(
    () =>
      markdownContent ? buildMarkdownThumbnailSvg(markdownContent, isDark) : "",
    [isDark, markdownContent]
  );

  return (
    <div className={cn(THUMBNAIL_SURFACE_CLASS, className)}>
      {previewSrc ? (
        <Image
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain"
          height={250}
          src={previewSrc}
          unoptimized
          width={400}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-md bg-muted/30 text-muted-foreground">
          <FileCode2 aria-hidden="true" className="size-4" />
        </div>
      )}
    </div>
  );
}
