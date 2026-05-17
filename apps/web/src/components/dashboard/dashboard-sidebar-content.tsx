"use client";

import { Button } from "@avenire/ui/components/button";
import { ExpandableTabs } from "@avenire/ui/components/expandable-tabs";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
} from "@avenire/ui/components/sidebar";
import { TooltipProvider } from "@avenire/ui/components/tooltip";
import { cn } from "@avenire/ui/lib/utils";
import {
  ListChecks,
  Chat as MessageSquare,
  SidebarSimple,
  Sparkle as Sparkles,
} from "@phosphor-icons/react";
import { Files } from "@phosphor-icons/react/Files";
import type { DashboardSidebarRuntime } from "@/components/dashboard/use-dashboard-sidebar";
import { DashboardSidebarMountedViews } from "./dashboard-sidebar-mounted-views";
import { DashboardSidebarWorkspaceHome } from "./dashboard-sidebar-workspace-home";

export function DashboardSidebarContent({
  runtime,
}: {
  runtime: DashboardSidebarRuntime;
}) {
  const {
    activeTabValue,
    closeMobileSidebar,
    isMobile,
    navigate,
    navigateToFilesRoot,
    primaryFilesRoute,
    setDesktopSidebarView,
    setMobileSidebarView,
    sidebarView,
    state,
    toggleSidebar,
    warmWorkspaceSection,
  } = runtime;

  return (
    <SidebarContent>
      <TooltipProvider delay={280}>
        <SidebarGroup className="px-2 pb-1">
          <div className="flex h-8 items-center gap-2 px-2">
            <SidebarGroupLabel className="h-auto flex-1 px-0">
              Workspace
            </SidebarGroupLabel>
            <Button
              aria-label={
                state === "expanded" ? "Collapse sidebar" : "Expand sidebar"
              }
              className="size-7 shrink-0 rounded-md"
              onClick={() => {
                toggleSidebar();
              }}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <SidebarSimple
                className={cn(
                  "size-4 transition-transform duration-300",
                  state === "expanded" ? "rotate-180" : "rotate-0"
                )}
              />
            </Button>
          </div>
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
            onItemContextMenu={(item) => {
              if (isMobile) {
                return;
              }

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
            value={activeTabValue}
          />
        </SidebarGroup>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {sidebarView === "workspace" ? (
            <DashboardSidebarWorkspaceHome
              closeMobileSidebar={closeMobileSidebar}
              isMobile={isMobile}
              navigate={navigate}
              navigateToFilesRoot={navigateToFilesRoot}
              primaryFilesRoute={primaryFilesRoute}
              setDesktopSidebarView={setDesktopSidebarView}
            />
          ) : (
            <DashboardSidebarMountedViews runtime={runtime} />
          )}
        </div>
      </TooltipProvider>
    </SidebarContent>
  );
}
