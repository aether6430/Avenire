"use client";

import { Button } from "@avenire/ui/components/button";
import { ButtonGroup } from "@avenire/ui/components/button-group";
import { SidebarTrigger } from "@avenire/ui/components/sidebar";
import { cn } from "@avenire/ui/lib/utils";
import { ArrowLeft, ArrowRight, House } from "@phosphor-icons/react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useHeaderStore } from "@/stores/header-store";
import { useWorkspaceHistoryStore } from "@/stores/workspaceHistoryStore";

interface WorkspaceHeaderProps {
  className?: string;
  homeHref?: string;
}

export function WorkspaceHeader({
  className,
  homeHref = "/workspace",
}: WorkspaceHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const leadingIcon = useHeaderStore((state) => state.leadingIcon);
  const breadcrumbs = useHeaderStore((state) => state.breadcrumbs);
  const actions = useHeaderStore((state) => state.actions);
  const title = useHeaderStore((state) => state.title);
  const historyEntries = useWorkspaceHistoryStore((state) => state.entries);
  const historyIndex = useWorkspaceHistoryStore((state) => state.index);

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
    "size-8 rounded-none border-0 bg-transparent text-foreground shadow-none hover:bg-muted/70 disabled:bg-transparent sm:size-10";

  return (
    <>
      {/* Desktop header — solid, sticky */}
      <header
        className={cn(
          "sticky top-0 z-30 hidden shrink-0 border-border/40 border-b bg-background/80 backdrop-blur-xl sm:block",
          className
        )}
      >
        <div className="flex min-h-14 shrink-0 flex-row items-center gap-1.5 px-4">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
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
            </ButtonGroup>
            <SidebarTrigger className="self-center size-10 rounded-md border border-border/60 bg-background text-muted-foreground shadow-sm hover:bg-muted/70" />
            <div className="hidden min-w-0 flex-1 items-center gap-1.5 sm:flex">
              <div className="hidden size-6 shrink-0 items-center justify-center text-muted-foreground sm:flex">
                {leadingIcon ?? (
                  <div
                    className="flex size-6 shrink-0 items-center justify-center text-muted-foreground empty:hidden"
                    id="workspace-header-leading-icon"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {breadcrumbs ?? (
                  <div className="min-w-0 flex-1" id="workspace-header-breadcrumbs">
                    {title ? (
                      <h1 className="truncate font-medium text-sm text-foreground">
                        {title}
                      </h1>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="hidden min-w-0 justify-end overflow-x-auto no-scrollbar sm:flex sm:w-auto">
            {actions}
          </div>
        </div>
      </header>

      {/* Mobile header — blurred overlay floating at top */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-40 sm:hidden",
          className
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* Blur + gradient backdrop */}
        <div
          className="absolute inset-0 border-border/20 border-b bg-background/45 backdrop-blur-2xl"
          style={{
            WebkitBackdropFilter: "blur(22px) saturate(180%)",
            backdropFilter: "blur(22px) saturate(180%)",
          }}
        />

        {/* Content */}
        <div className="relative flex h-12 items-center gap-2 px-3">
          <SidebarTrigger className="size-8 shrink-0 rounded-md border border-white/10 bg-white/5 text-muted-foreground shadow-none hover:bg-white/10 hover:text-foreground" />

          <div className="min-w-0 flex-1 overflow-hidden text-center">
            {breadcrumbs ?? (
              <div id="workspace-header-breadcrumbs">
                {title ? (
                  <h1 className="truncate font-medium text-sm text-foreground">
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
          </div>
        </div>
      </header>

      {/* Mobile header spacer so content doesn't hide behind fixed header */}
      <div className="h-12 shrink-0 sm:hidden" />
    </>
  );
}
