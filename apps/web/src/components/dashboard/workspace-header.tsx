"use client";

import { Button } from "@avenire/ui/components/button";
import { ButtonGroup } from "@avenire/ui/components/button-group";
import { cn } from "@avenire/ui/lib/utils";
import { ArrowLeft, ArrowRight, House } from "@phosphor-icons/react";
import type { Route } from "next";
import { usePanePathname, usePaneRouter } from "@/lib/workspace-panes";
import { usePaneHeaderStore } from "@/stores/header-store";
import { usePaneWorkspaceHistoryStore } from "@/stores/workspaceHistoryStore";
import type { ReactNode } from "react";

interface WorkspaceHeaderProps {
  className?: string;
  compact?: boolean;
  homeHref?: string;
  overlay?: boolean;
  paneId?: string;
  trailingActions?: ReactNode;
}

export function WorkspaceHeader({
  className,
  compact = false,
  homeHref = "/workspace",
  overlay = false,
  trailingActions,
  paneId: _paneId,
}: WorkspaceHeaderProps) {
  const router = usePaneRouter();
  const pathname = usePanePathname();
  const leadingIcon = usePaneHeaderStore((state) => state.leadingIcon);
  const breadcrumbs = usePaneHeaderStore((state) => state.breadcrumbs);
  const actions = usePaneHeaderStore((state) => state.actions);
  const title = usePaneHeaderStore((state) => state.title);
  const historyEntries = usePaneWorkspaceHistoryStore((state) => state.entries);
  const historyIndex = usePaneWorkspaceHistoryStore((state) => state.index);

  const backRoute =
    historyIndex > 0 ? (historyEntries[historyIndex - 1] ?? null) : null;
  const forwardRoute =
    historyIndex >= 0 && historyIndex < historyEntries.length - 1
      ? (historyEntries[historyIndex + 1] ?? null)
      : null;
  const isHome = pathname === homeHref;

  const segmentedGroupClass =
    "self-center divide-x divide-border/60 overflow-hidden rounded-md border border-border/60 bg-background shadow-sm";
  const segmentedIconButtonClass =
    "size-7 rounded-none border-0 bg-transparent text-foreground shadow-none hover:bg-muted/70 disabled:bg-transparent";
  const shouldUseCompactDesktop = compact;

  if (!compact) {
    return (
      <header
        className={cn(
          "w-full sticky top-0 z-30 shrink-0 border-border/40 border-b bg-background/80 backdrop-blur-xl",
          className
        )}
      >
        <div
          className={cn(
            "w-full flex shrink-0 flex-row items-center px-3",
            shouldUseCompactDesktop ? "min-h-10 gap-1.5" : "min-h-11 gap-1"
          )}
        >
          <div className="flex min-w-0 w-full items-center gap-1">
            <ButtonGroup className={segmentedGroupClass}>
              <Button
                aria-label="Go back"
                className={segmentedIconButtonClass}
                disabled={!backRoute}
                onClick={() => {
                  if (backRoute) {
                    router.push(backRoute as Route);
                  }
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ArrowLeft className="size-3.5" />
              </Button>
              <Button
                aria-label="Go home"
                className={segmentedIconButtonClass}
                disabled={isHome}
                onClick={() => {
                  router.push(homeHref as Route);
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <House className="size-3.5" />
              </Button>
              <Button
                aria-label="Go forward"
                className={segmentedIconButtonClass}
                disabled={!forwardRoute}
                onClick={() => {
                  if (forwardRoute) {
                    router.push(forwardRoute as Route);
                  }
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ArrowRight className="size-3.5" />
              </Button>
            </ButtonGroup>
            <div className="flex min-w-0 w-full items-center gap-1">
              <div className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
                {leadingIcon ?? (
                  <div
                    className="flex size-5 shrink-0 items-center justify-center text-muted-foreground empty:hidden"
                    id="workspace-header-leading-icon"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {breadcrumbs ?? (
                  <div className="min-w-0 flex-1" id="workspace-header-breadcrumbs">
                    {title ? (
                      <h1
                        className={cn(
                          "truncate font-medium text-foreground",
                          shouldUseCompactDesktop
                            ? "text-xs leading-4"
                            : "text-[13px] leading-5"
                        )}
                      >
                        {title}
                      </h1>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex min-w-0 w-full pr-4 items-center justify-end gap-1 overflow-x-auto no-scrollbar">
            <div className="flex min-w-0 items-center justify-end gap-1">
              {actions}
            </div>
            {trailingActions ? (
              <div className="shrink-0">
                {trailingActions}
              </div>
            ) : null}
          </div>
        </div>
      </header>
    );
  }

  const isOverlayCompact = overlay;

  return (
    <>
      <header
        className={cn(
          isOverlayCompact ? "w-full fixed top-0 left-0 right-0 z-40" : "w-full sticky top-0 z-40",
          className
        )}
        style={isOverlayCompact ? { paddingTop: "env(safe-area-inset-top)" } : undefined}
      >
        <div
          className="absolute inset-0 border-border/20 border-b bg-background/45 backdrop-blur-2xl"
          style={{
            WebkitBackdropFilter: "blur(22px) saturate(180%)",
            backdropFilter: "blur(22px) saturate(180%)",
          }}
        />

        <div className="relative flex h-10 items-center gap-1.5 px-3">
          <div className="flex shrink-0 items-center gap-1">
            <ButtonGroup className={segmentedGroupClass}>
              <Button
                aria-label="Go back"
                className={segmentedIconButtonClass}
                disabled={!backRoute}
                onClick={() => {
                  if (backRoute) {
                    router.push(backRoute as Route);
                  }
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ArrowLeft className="size-3.5" />
              </Button>
              <Button
                aria-label="Go home"
                className={segmentedIconButtonClass}
                disabled={isHome}
                onClick={() => {
                  router.push(homeHref as Route);
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <House className="size-3.5" />
              </Button>
              <Button
                aria-label="Go forward"
                className={segmentedIconButtonClass}
                disabled={!forwardRoute}
                onClick={() => {
                  if (forwardRoute) {
                    router.push(forwardRoute as Route);
                  }
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ArrowRight className="size-3.5" />
              </Button>
            </ButtonGroup>
          </div>
          <div className="min-w-0 flex-1 overflow-hidden text-center">
            {breadcrumbs ?? (
              <div id="workspace-header-breadcrumbs">
                {title ? (
                  <h1 className="truncate font-medium text-[13px] leading-5 text-foreground">
                    {title}
                  </h1>
                ) : (
                  <div id="workspace-header-leading-icon" />
                )}
              </div>
            )}
          </div>

          <div className="flex min-w-0 shrink-0 items-center justify-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {actions}
            {trailingActions}
          </div>
        </div>
      </header>
      {isOverlayCompact ? <div className="h-10 shrink-0" /> : null}
    </>
  );
}
