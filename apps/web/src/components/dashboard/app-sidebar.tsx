"use client";

import type { ChatSummary } from "@avenire/database";
import { Button } from "@avenire/ui/components/button";
import { Sidebar } from "@avenire/ui/components/sidebar";
import { SidebarFooter } from "@avenire/ui/components/sidebar";
import { cn } from "@avenire/ui/lib/utils";
import { Trash as Trash2, Waves } from "@phosphor-icons/react";
import { Gear as Settings } from "@phosphor-icons/react/Gear";
import dynamic from "next/dynamic";
import type { ComponentProps, CSSProperties } from "react";
import { DashboardSidebarContent } from "@/components/dashboard/dashboard-sidebar-content";
import { useDashboardSidebar } from "@/components/dashboard/use-dashboard-sidebar";

interface DashboardSidebarUser {
  avatar?: string;
  email: string;
  name: string;
}

const DeferredNavUser = dynamic(
  () =>
    import("@/components/dashboard/nav-user").then((module) => ({
      default: module.NavUser,
    })),
  { loading: () => <div className="h-14" /> }
);

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
    <Sidebar
      className={cn(
        "z-40 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        className
      )}
      collapsible="icon"
      style={style as CSSProperties}
      variant="inset"
      {...props}
    >
      <DashboardSidebarContent runtime={runtime} />
      <SidebarFooter>
        <div className="mb-2 flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-1">
            <Button
              className="hit-area h-8 w-8"
              onClick={() => {
                runtime.openTrash();
              }}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Open trash</span>
            </Button>
            <Button
              className="hit-area h-8 w-8"
              onClick={() => {
                runtime.openUploadActivity();
              }}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Waves className="size-4" />
              <span className="sr-only">Upload activity</span>
            </Button>
            <Button
              className="hit-area h-8 w-8"
              id="dashboard-settings-trigger"
              onClick={() => {
                runtime.openSettings();
              }}
              onFocus={() => {
                void import("@/components/settings/settings-dialog").catch(
                  () => undefined
                );
              }}
              onPointerEnter={() => {
                void import("@/components/settings/settings-dialog").catch(
                  () => undefined
                );
              }}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Settings className="size-4" />
              <span className="sr-only">Open settings</span>
            </Button>
          </div>
        </div>
        {runtime.deferredStartupReady ? (
          <DeferredNavUser
            activeWorkspaceId={runtime.workspaceUuid}
            invitations={runtime.invitations}
            invitationsErrorMessage={runtime.invitationsErrorMessage}
            invitationsLoadFailed={runtime.invitationsLoadFailed}
            invitationsLoading={runtime.invitationsLoading}
            onAcceptInvitation={(invitationId) => {
              void runtime.respondToInvitation(invitationId, "accept");
            }}
            onCreateWorkspace={runtime.createWorkspace}
            onDeclineInvitation={(invitationId) => {
              void runtime.respondToInvitation(invitationId, "decline");
            }}
            onSwitchWorkspace={(workspace) => {
              void runtime.switchWorkspace(workspace);
            }}
            user={user}
            workspaceActionStatus={runtime.workspaceActionStatus}
            workspaces={runtime.workspaces}
            workspacesErrorMessage={runtime.workspacesErrorMessage}
            workspacesLoadFailed={runtime.workspacesLoadFailed}
            workspacesLoading={runtime.workspacesLoading}
          />
        ) : (
          <div className="h-14" />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
