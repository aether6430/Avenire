"use client";

import { ExpandableTabs } from "@avenire/ui/components/expandable-tabs";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarTrigger,
} from "@avenire/ui/components/sidebar";
import { TooltipProvider } from "@avenire/ui/components/tooltip";
import { cn } from "@avenire/ui/lib/utils";
import {
  ListChecks,
  Chat as MessageSquare,
  Sparkle as Sparkles,
} from "@phosphor-icons/react";
import { Files } from "@phosphor-icons/react/Files";
import type { DashboardSidebarRuntime } from "@/components/dashboard/use-dashboard-sidebar";
import { DashboardSidebarMountedViews } from "./dashboard-sidebar-mounted-views";

export function DashboardSidebarContent({
  runtime,
}: {
  runtime: DashboardSidebarRuntime;
}) {
  const {
    activeTabValue,
    isMobile,
    setDesktopSidebarView,
    setMobileSidebarView,
    isPeekabooActive,
    state,
    warmWorkspaceSection,
  } = runtime;
  const showSidebarBody = isMobile || state !== "collapsed" || isPeekabooActive;
  const isCollapsedRail =
    !isMobile && state === "collapsed" && !isPeekabooActive;

  return (
    <SidebarContent>
      <TooltipProvider delay={280}>
        <SidebarGroup className="px-2 pb-1">
          <div
            className={cn(
              "flex h-8 items-center",
              isCollapsedRail ? "justify-center px-0" : "gap-2 px-2"
            )}
          >
            {isCollapsedRail ? null : (
              <SidebarGroupLabel className="h-auto flex-1 px-0">
                Workspace
              </SidebarGroupLabel>
            )}
            <SidebarTrigger className="hidden size-7 shrink-0 text-muted-foreground hover:text-foreground md:inline-flex" />
          </div>
          {isCollapsedRail ? null : (
            <ExpandableTabs
              allowDeselect={false}
              className="mt-1"
              items={[
                { value: "chat", label: "Methods", icon: MessageSquare },
                { value: "flashcards", label: "Mindset Sets", icon: Sparkles },
                { value: "tasks", label: "Tasks", icon: ListChecks },
                { value: "files", label: "Files", icon: Files },
              ]}
              onItemClick={(item) => {
                const nextView = item.value as
                  | "chat"
                  | "flashcards"
                  | "files"
                  | "tasks";

                if (isMobile) {
                  setMobileSidebarView(nextView);
                } else {
                  setDesktopSidebarView(nextView);
                }
              }}
              onItemContextMenu={(item, event) => {
                if (isMobile) {
                  return;
                }

                const nextView = item.value as
                  | "chat"
                  | "flashcards"
                  | "files"
                  | "tasks";
                event.preventDefault();
                if (isMobile) {
                  setMobileSidebarView(nextView);
                } else {
                  setDesktopSidebarView(nextView);
                }
              }}
              onItemHover={(item) => {
                warmWorkspaceSection(
                  item.value as "chat" | "flashcards" | "files" | "tasks"
                );
              }}
              onValueChange={(nextValue) => {
                if (!nextValue) {
                  return;
                }
                const nextView = nextValue as
                  | "chat"
                  | "flashcards"
                  | "files"
                  | "tasks";
                if (isMobile) {
                  setMobileSidebarView(nextView);
                } else {
                  setDesktopSidebarView(nextView);
                }
              }}
              persistenceKey="dashboard-workspace-tabs"
              showSelectedLabel={false}
              value={activeTabValue}
            />
          )}
        </SidebarGroup>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {showSidebarBody ? (
            <DashboardSidebarMountedViews runtime={runtime} />
          ) : null}
        </div>
      </TooltipProvider>
    </SidebarContent>
  );
}
