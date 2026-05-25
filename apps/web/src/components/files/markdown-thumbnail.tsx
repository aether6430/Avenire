"use client";

import { cn } from "@avenire/ui/lib/utils";
import { FileCode as FileCode2 } from "@phosphor-icons/react";
import { THUMBNAIL_SURFACE_CLASS } from "./file-card-thumbnail-shared";

interface MarkdownThumbnailProps {
  className?: string;
  content?: string | null;
}

export function MarkdownThumbnail({
  className,
  content,
}: MarkdownThumbnailProps) {
  const markdownContent = typeof content === "string" ? content.trim() : "";

  return (
    <div
      className={cn(THUMBNAIL_SURFACE_CLASS, "bg-muted/65 p-1.5", className)}
    >
      {markdownContent ? (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[5px] border border-border/60 bg-background/95 shadow-sm">
          <div className="flex h-6 shrink-0 items-center gap-1.5 border-border/60 border-b px-2">
            <div className="size-1.5 rounded-sm bg-muted-foreground/35" />
            <div className="h-1.5 w-14 rounded-sm bg-muted-foreground/25" />
          </div>
          <div className="grid flex-1 grid-cols-[1.1fr_0.85fr_0.85fr] grid-rows-4 overflow-hidden">
            {Array.from({ length: 12 }, (_unused, index) => {
              const row = Math.floor(index / 3);
              const column = index % 3;
              const widths = ["w-10/12", "w-7/12", "w-8/12"];

              return (
                <div
                  className={cn(
                    "flex items-center border-border/50 border-b px-2",
                    column > 0 && "border-l",
                    row === 3 && "border-b-0"
                  )}
                  key={`cell-${row}-${column}`}
                >
                  {row === 0 ? (
                    <div
                      className={cn(
                        "h-1.5 rounded-sm bg-muted-foreground/30",
                        widths[column]
                      )}
                    />
                  ) : (
                    <div
                      className={cn(
                        "h-1 rounded-sm bg-muted-foreground/18",
                        column === 0 && row === 1 && "w-9/12",
                        column === 0 && row === 2 && "w-6/12",
                        column === 0 && row === 3 && "w-8/12",
                        column === 1 && row === 1 && "w-5/12",
                        column === 1 && row === 2 && "w-7/12",
                        column === 1 && row === 3 && "w-4/12",
                        column === 2 && row === 1 && "w-7/12",
                        column === 2 && row === 2 && "w-5/12",
                        column === 2 && row === 3 && "w-6/12"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-[5px] bg-muted/30 text-muted-foreground">
          <FileCode2 aria-hidden="true" className="size-4" />
        </div>
      )}
    </div>
  );
}
