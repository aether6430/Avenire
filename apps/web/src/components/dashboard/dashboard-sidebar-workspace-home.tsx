"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@avenire/ui/components/sidebar";
import {
  ListChecks,
  Chat as MessageSquare,
  Sparkle as Sparkles,
} from "@phosphor-icons/react";
import { Files } from "@phosphor-icons/react/Files";
import type { Route } from "next";
import { SectionButton } from "./dashboard-sidebar-shared";

export function DashboardSidebarWorkspaceHome({
  closeMobileSidebar,
  isMobile,
  navigate,
  navigateToFilesRoot,
  primaryFilesRoute,
  setDesktopSidebarView,
}: {
  closeMobileSidebar: () => void;
  isMobile: boolean;
  navigate: (
    href: Route,
    options?: {
      openInNewPane?: boolean;
    }
  ) => void;
  navigateToFilesRoot: (options?: { openInNewPane?: boolean }) => Promise<void>;
  primaryFilesRoute: Route;
  setDesktopSidebarView: (
    nextView: "chat" | "flashcards" | "files" | "tasks"
  ) => void;
}) {
  return (
    <div className="absolute inset-0 overflow-y-auto px-2 py-2">
      <SidebarGroup>
        <SidebarGroupLabel>Workspace Home</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SectionButton
              dragHref={"/workspace/chats/new" as Route}
              icon={MessageSquare}
              label="New Method"
              onClick={(event) => {
                closeMobileSidebar();
                navigate("/workspace/chats/new" as Route, {
                  openInNewPane: !isMobile && event.altKey,
                });
              }}
              onContextMenu={(event) => {
                if (isMobile) {
                  return;
                }
                event.preventDefault();
                navigate("/workspace/chats/new" as Route, {
                  openInNewPane: true,
                });
              }}
            />
            <SectionButton
              dragHref={"/workspace/flashcards" as Route}
              icon={Sparkles}
              label="Open Mindset Sets"
              onClick={(event) => {
                closeMobileSidebar();
                if (!isMobile) {
                  setDesktopSidebarView("flashcards");
                  navigate("/workspace/flashcards" as Route, {
                    openInNewPane: event.altKey,
                  });
                  return;
                }
                navigate("/workspace/flashcards" as Route, {
                  openInNewPane: false,
                });
              }}
              onContextMenu={(event) => {
                if (isMobile) {
                  return;
                }
                event.preventDefault();
                setDesktopSidebarView("flashcards");
                navigate("/workspace/flashcards" as Route, {
                  openInNewPane: true,
                });
              }}
            />
            <SectionButton
              dragHref={primaryFilesRoute}
              icon={Files}
              label="Open Files"
              onClick={(event) => {
                closeMobileSidebar();
                if (!isMobile) {
                  void navigateToFilesRoot({
                    openInNewPane: event.altKey,
                  });
                  return;
                }
                void navigateToFilesRoot({
                  openInNewPane: false,
                });
              }}
              onContextMenu={(event) => {
                if (isMobile) {
                  return;
                }
                event.preventDefault();
                void navigateToFilesRoot({ openInNewPane: true });
              }}
            />
            <SectionButton
              dragHref={"/workspace/tasks" as Route}
              icon={ListChecks}
              label="Open Tasks"
              onClick={(event) => {
                closeMobileSidebar();
                navigate("/workspace/tasks" as Route, {
                  openInNewPane: !isMobile && event.altKey,
                });
              }}
              onContextMenu={(event) => {
                if (isMobile) {
                  return;
                }
                event.preventDefault();
                navigate("/workspace/tasks" as Route, {
                  openInNewPane: true,
                });
              }}
            />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
}
