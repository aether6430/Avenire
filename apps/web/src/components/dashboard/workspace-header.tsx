"use client";

import { Button } from "@avenire/ui/components/button";
import { SidebarTrigger } from "@avenire/ui/components/sidebar";
import { cn } from "@avenire/ui/lib/utils";
import { ArrowLeft, ArrowRight, House } from "lucide-react";
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

  return (
    <header
      className={cn(
        "sticky top-0 z-30 shrink-0 border-border/40 border-b bg-background",
        className
      )}
    >
      <div className="flex min-h-14 shrink-0 flex-wrap items-start gap-1.5 px-3 py-2 sm:flex-nowrap sm:items-center sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <SidebarTrigger className="size-7 rounded-sm border border-border/60 bg-background text-muted-foreground shadow-sm hover:bg-secondary" />
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
        <div className="flex w-full min-w-0 justify-end overflow-x-auto no-scrollbar sm:w-auto">
          {actions ?? (
            <div
              className="flex items-center gap-1.5 empty:hidden"
              id="workspace-header-actions"
            />
          )}
        </div>
      </div>
    </header>
  );
}
