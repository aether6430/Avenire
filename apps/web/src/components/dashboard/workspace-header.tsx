"use client";

import { Button } from "@avenire/ui/components/button";
import { ButtonGroup } from "@avenire/ui/components/button-group";
import { SidebarTrigger } from "@avenire/ui/components/sidebar";
import { cn } from "@avenire/ui/lib/utils";
import { ArrowLeft, ArrowRight, House } from "@phosphor-icons/react";
import type { Route } from "next";
import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePanePathname, usePaneRouter } from "@/lib/workspace-panes";
import { usePaneHeaderStore } from "@/stores/header-store";
import { usePaneWorkspaceHistoryStore } from "@/stores/workspaceHistoryStore";

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
  const isMobile = useIsMobile();
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
    "self-center divide-x divide-border/50 overflow-hidden rounded-md border border-border/50 bg-background/70 shadow-sm";
  const segmentedIconButtonClass =
    "size-6 rounded-none border-0 bg-transparent text-foreground shadow-none hover:bg-muted/70 disabled:bg-transparent md:size-7";
  const shouldUseCompactDesktop = compact;

  if (isMobile) {
    return null;
  }

  if (!compact) {
    return (
      <header
        className={cn(
          "sticky top-0 z-30 w-full shrink-0 border-border/40 border-b bg-background/80 backdrop-blur-xl",
          className
        )}
      >
        <div
          className={cn(
            "flex w-full shrink-0 flex-row items-center px-2.5 md:px-3",
            shouldUseCompactDesktop ? "min-h-10 gap-1.5" : "min-h-11 gap-1"
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <SidebarTrigger className="size-7 shrink-0 md:hidden" />
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
            <div className="flex w-full min-w-0 items-center gap-1">
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
                  <div
                    className="min-w-0 flex-1"
                    id="workspace-header-breadcrumbs"
                  >
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
          <div className="no-scrollbar flex max-w-[48%] shrink-0 items-center justify-end gap-1 overflow-x-auto pr-3 md:max-w-[52%] md:pr-4">
            <div className="flex min-w-max items-center justify-end gap-1">
              {actions}
            </div>
            {trailingActions ? (
              <div className="shrink-0">{trailingActions}</div>
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
          isOverlayCompact
            ? "fixed top-0 right-0 left-0 z-40 w-full"
            : "sticky top-0 z-40 w-full",
          className
        )}
        style={
          isOverlayCompact
            ? { paddingTop: "env(safe-area-inset-top)" }
            : undefined
        }
      >
        <div
          className="absolute inset-0 border-border/20 border-b bg-background/45 backdrop-blur-xl"
          style={{
            WebkitBackdropFilter: "blur(12px) saturate(180%)",
            backdropFilter: "blur(12px) saturate(180%)",
          }}
        />

        <div className="relative flex h-9 items-center gap-1.5 px-2.5 md:h-10 md:px-3">
          <div className="flex shrink-0 items-center gap-1">
            <SidebarTrigger className="size-7 md:hidden" />
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
                  <h1 className="truncate font-medium text-xs text-foreground leading-4 md:text-[13px] md:leading-5">
                    {title}
                  </h1>
                ) : (
                  <div id="workspace-header-leading-icon" />
                )}
              </div>
            )}
          </div>

          <div className="flex max-w-[44%] shrink-0 items-center justify-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {actions}
            {trailingActions}
          </div>
        </div>
      </header>
      {isOverlayCompact ? <div className="h-9 shrink-0 md:h-10" /> : null}
    </>
  );
}
