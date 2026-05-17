"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@avenire/ui/components/dropdown-menu";
import { cn } from "@avenire/ui/lib/utils";
import {
  Columns,
  DotsThree as MoreHorizontal,
  Rows,
  X,
} from "@phosphor-icons/react";
import type { DragEvent as ReactDragEvent, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import {
  WorkspacePaneInteractionBoundary,
  WorkspacePaneProvider,
} from "@/lib/workspace-panes";
import { WorkspaceHeader } from "./workspace-header";
import type {
  PaneDropRegion,
  RenderablePane,
} from "./workspace-pane-renderer-model";
import {
  COMPACT_PANE_WIDTH,
  getDropIndicatorStyle,
  isInteractiveHeaderTarget,
} from "./workspace-pane-renderer-model";
import { WorkspacePaneScene } from "./workspace-pane-scene";

function PaneHeader({
  compact,
  paneId,
  trailingActions,
}: {
  compact: boolean;
  paneId: string;
  trailingActions?: ReactNode;
}) {
  return (
    <WorkspaceHeader
      className="border-b-0"
      compact={compact}
      paneId={paneId}
      trailingActions={trailingActions ?? null}
    />
  );
}

export function WorkspacePaneSurface({
  dropRegion,
  isActive,
  isDragging,
  isPreviewPane,
  isMultiPane,
  onClose,
  onDragEnd,
  onDragStart,
  onDrop,
  onDragOver,
  onDragLeave,
  onFocus,
  onSplitHorizontal,
  onSplitVertical,
  pane,
}: {
  dropRegion: PaneDropRegion | null;
  isActive: boolean;
  isDragging: boolean;
  isPreviewPane: boolean;
  isMultiPane: boolean;
  onClose: () => void;
  onDragEnd: () => void;
  onDragStart: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: ReactDragEvent<HTMLDivElement>) => void;
  onFocus: () => void;
  onSplitHorizontal: () => void;
  onSplitVertical: () => void;
  pane: RenderablePane;
}) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = surfaceRef.current;
    if (!element) {
      return;
    }

    const updateWidth = () => {
      setWidth(element.getBoundingClientRect().width);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      return () => undefined;
    }

    const observer = new ResizeObserver(() => {
      updateWidth();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const isCompact = width > 0 && width < COMPACT_PANE_WIDTH;
  const showPaneMenuInHeader =
    !pane.route.pathname.startsWith("/workspace/files/");
  const paneMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            aria-label="Pane actions"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground shadow-sm transition hover:bg-muted/70 hover:text-foreground"
            type="button"
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5">
        <DropdownMenuItem onClick={onSplitHorizontal}>
          <Columns className="mr-2 size-4" />
          Split right
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSplitVertical}>
          <Rows className="mr-2 size-4" />
          Split down
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={onClose}
        >
          <X className="mr-2 size-4" />
          Close pane
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="w-full min-w-0" ref={surfaceRef}>
      <WorkspacePaneProvider
        isActive={isActive}
        isCompact={isCompact}
        paneId={pane.id}
        route={pane.route}
      >
        <div
          className={cn(
            "relative flex h-full min-w-0 flex-col overflow-hidden border-border/70 border-r bg-background transition-[opacity,transform,box-shadow] duration-200 ease-out",
            isActive ? "ring-1 ring-border/90 ring-inset" : "ring-0",
            isDragging && "opacity-0",
            isPreviewPane &&
              "border border-primary/35 border-dashed bg-primary/[0.04] shadow-[inset_0_0_0_1px_rgba(59,130,246,0.08)]"
          )}
          onClick={onFocus}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {isPreviewPane ? (
            <div className="flex h-full min-h-0 flex-1 items-center justify-center px-6 text-center text-muted-foreground/70 text-sm">
              Drop to open here
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "min-w-0",
                  isMultiPane &&
                    "cursor-grab select-none active:cursor-grabbing"
                )}
                draggable={isMultiPane}
                onDragEnd={onDragEnd}
                onDragStart={(event) => {
                  if (isInteractiveHeaderTarget(event.target)) {
                    event.preventDefault();
                    return;
                  }
                  onDragStart(event);
                }}
              >
                {isMultiPane ? (
                  <PaneHeader
                    compact={isCompact}
                    paneId={pane.id}
                    trailingActions={showPaneMenuInHeader ? paneMenu : null}
                  />
                ) : (
                  <WorkspaceHeader
                    className="border-b-0"
                    compact={isCompact}
                    paneId={pane.id}
                    trailingActions={showPaneMenuInHeader ? paneMenu : null}
                  />
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <WorkspacePaneInteractionBoundary>
                  <WorkspacePaneScene
                    paneId={pane.id}
                    pathname={pane.route.pathname}
                    search={pane.route.search}
                  />
                </WorkspacePaneInteractionBoundary>
              </div>
            </>
          )}
          {dropRegion ? (
            <div className="pointer-events-none absolute inset-0 z-30 p-2">
              <div
                className={cn(
                  "absolute transition-[inset,width,height,background-color,border-color,opacity] duration-100 ease-out",
                  dropRegion === "center"
                    ? "rounded-md border border-primary/45 bg-primary/[0.035]"
                    : "rounded-sm bg-primary"
                )}
                style={getDropIndicatorStyle(dropRegion)}
              />
            </div>
          ) : null}
        </div>
      </WorkspacePaneProvider>
    </div>
  );
}
