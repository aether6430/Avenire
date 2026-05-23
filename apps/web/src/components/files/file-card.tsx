import { cn } from "@avenire/ui/lib/utils";
import { FileCode as FileCode2 } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { formatTimeAgo } from "./file-card-thumbnail-model";

export type FileCardType =
  | "archive"
  | "audio"
  | "code"
  | "document"
  | "image"
  | "other"
  | "video";

interface FileCardProps {
  className?: string;
  details?: Array<{
    label: string;
    value: string;
  }>;
  fileType: FileCardType;
  lastUpdated: Date;
  matchMeta?: string;
  matchSnippet?: string;
  name: string;
  previewContent?: React.ReactNode;
  previewUrl?: string;
  variant?: "grid" | "row";
}

function getFileIcon(fileType: FileCardType): React.ReactNode {
  if (fileType === "code") {
    return <FileCode2 aria-hidden="true" className="h-4 w-4" />;
  }

  const iconByType: Record<FileCardType, string> = {
    archive: "/icons/zip.svg",
    audio: "/icons/audio.svg",
    code: "/icons/_file.svg",
    document: "/icons/text.svg",
    image: "/icons/image.svg",
    other: "/icons/_file.svg",
    video: "/icons/video.svg",
  };

  return (
    <Image
      alt=""
      aria-hidden="true"
      className="h-4 w-4"
      height={16}
      loading="lazy"
      src={iconByType[fileType]}
      width={16}
    />
  );
}

export function FileCard({
  className = "",
  details = [],
  fileType,
  lastUpdated,
  matchMeta,
  matchSnippet,
  name,
  previewContent,
  previewUrl,
  variant = "grid",
}: FileCardProps) {
  const [timeAgo, setTimeAgo] = useState(() => formatTimeAgo(lastUpdated));
  useEffect(() => {
    setTimeAgo(formatTimeAgo(lastUpdated));
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(lastUpdated));
    }, 60_000);

    return () => {
      clearInterval(interval);
    };
  }, [lastUpdated]);

  const hasPreview = Boolean(previewContent || previewUrl);
  let previewBody: React.ReactNode = null;

  if (previewContent) {
    previewBody = (
      <div className="h-full w-full overflow-hidden rounded-md [&_canvas]:h-full [&_canvas]:w-full [&_canvas]:rounded-md [&_img]:h-full [&_img]:w-full [&_img]:rounded-md [&_img]:object-contain [&_video]:h-full [&_video]:w-full [&_video]:rounded-md [&_video]:object-contain">
        {previewContent}
      </div>
    );
  } else if (previewUrl) {
    previewBody = (
      <div className="h-full w-full overflow-hidden rounded-md">
        <Image
          alt={name}
          className="h-full w-full rounded-md object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          height={168}
          src={previewUrl}
          unoptimized
          width={224}
        />
      </div>
    );
  } else {
    previewBody = (
      <div className="flex h-full w-full flex-col items-center justify-center text-neutral-400 transition-colors group-hover:text-neutral-300">
        <div className="h-8 w-8 opacity-60">{getFileIcon(fileType)}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        variant === "row"
          ? "grid w-full max-w-full grid-cols-[7.5rem_minmax(0,1fr)] items-stretch gap-3 overflow-hidden"
          : "inline-flex w-full max-w-full flex-col items-center gap-2 overflow-hidden",
        className
      )}
    >
      <div
        className={cn(
          "group relative flex w-full min-w-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/70",
          variant === "row"
            ? "h-full min-h-24"
            : hasPreview
              ? "h-28"
              : "aspect-[4/3] h-28"
        )}
      >
        {previewBody}
        {hasPreview ? (
          <div className="pointer-events-none absolute inset-0 bg-black opacity-0 transition-opacity duration-300 group-hover:opacity-10" />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex w-full min-w-0 max-w-full items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 text-muted-foreground">
              {getFileIcon(fileType)}
            </span>
            <span
              className="min-w-0 flex-1 truncate font-medium text-sm"
              title={name}
            >
              {name}
            </span>
          </div>
          <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
            {timeAgo}
          </span>
        </div>
        {matchSnippet ? (
          <div className="min-w-0">
            {matchMeta ? (
              <p className="mb-1 truncate text-[10px] text-muted-foreground">
                {matchMeta}
              </p>
            ) : null}
            <p className="line-clamp-3 text-muted-foreground text-xs leading-5">
              {matchSnippet}
            </p>
          </div>
        ) : null}
        {details.length > 0 ? (
          <div className="flex w-full min-w-0 flex-wrap gap-1.5">
            {details.map((detail) => (
              <span
                className="inline-flex max-w-full items-center gap-1 rounded-md bg-background/75 px-2 py-0.5 text-[10px] text-muted-foreground leading-none"
                key={`${detail.label}:${detail.value}`}
                title={`${detail.label}: ${detail.value}`}
              >
                <span className="shrink-0 font-medium text-foreground/75">
                  {detail.label}
                </span>
                <span className="min-w-0 max-w-24 truncate">
                  {detail.value}
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
