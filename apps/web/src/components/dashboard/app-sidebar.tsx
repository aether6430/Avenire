"use client";

import { Sidebar } from "@avenire/ui/components/sidebar";
import { cn } from "@avenire/ui/lib/utils";
import type { ComponentProps, CSSProperties } from "react";
import { DashboardSidebarContent } from "@/components/dashboard/dashboard-sidebar-content";
import { DashboardSidebarFooter } from "@/components/dashboard/dashboard-sidebar-footer";
import { useDashboardSidebar } from "@/components/dashboard/use-dashboard-sidebar";
import type { ChatSummary } from "@/lib/chat-data";

interface DashboardSidebarUser {
  avatar?: string;
  email: string;
  name: string;
}

export function DashboardSidebar({
  user,
  activeWorkspace,
  initialWorkspaces = [],
  initialChats = [],
  activeChatSlug,
  className,
  style,
  ...props
}: ComponentProps<typeof Sidebar> & {
  activeWorkspace?: {
    name?: string;
    organizationId?: string | null;
    rootFolderId: string;
    workspaceId: string;
  } | null;
  user?: DashboardSidebarUser;
  initialWorkspaces?: Array<{
    workspaceId: string;
    organizationId: string;
    rootFolderId: string;
    name: string;
  }>;
  initialChats?: ChatSummary[];
  activeChatSlug?: string;
}) {
  const runtime = useDashboardSidebar({
    activeChatSlug,
    activeWorkspace,
    initialChats,
    initialWorkspaces,
  });

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-10 md:block",
          runtime.state === "collapsed" && !runtime.isPeekabooActive
            ? "pointer-events-auto"
            : "pointer-events-none"
        )}
        onPointerEnter={runtime.openPeekSidebar}
        onPointerLeave={runtime.closePeekSidebar}
      />
      <Sidebar
        className={cn(
          "z-40 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          className,
          runtime.isPeekabooActive && "ring-1 ring-sidebar-border"
        )}
        onPointerEnter={runtime.openPeekSidebar}
        onPointerLeave={runtime.closePeekSidebar}
        style={
          {
            ...style,
            left: runtime.isPeekabooActive ? "0" : undefined,
            top: runtime.isPeekabooActive ? "0.75rem" : undefined,
            bottom: runtime.isPeekabooActive ? "0.75rem" : undefined,
            borderRadius: runtime.isPeekabooActive ? "1.5rem" : undefined,
          } as CSSProperties
        }
        variant="inset"
        {...props}
      >
        <DashboardSidebarContent runtime={runtime} />
        <DashboardSidebarFooter runtime={runtime} user={user} />
      </Sidebar>
    </>
  );
}
