"use client";

import { SidebarInset, SidebarProvider } from "@avenire/ui/components/sidebar";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense, useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/app-sidebar";
import { useCommandPalette } from "@/components/dashboard/use-command-palette";
import { WorkspacePaneRenderer } from "@/components/dashboard/workspace-pane-renderer";
import { ChatPet } from "@/components/pets/chat-pet";

const DeferredCommandPaletteSurface = dynamic(
  () =>
    import("@/components/dashboard/command-palette-surface").then((module) => ({
      default: module.CommandPaletteSurface,
    })),
  { loading: () => null }
);

const DeferredQuickCaptureHost = dynamic(
  () =>
    import("@/components/dashboard/quick-capture-host").then((module) => ({
      default: module.QuickCaptureHost,
    })),
  { loading: () => null }
);

const DeferredWorkspaceRealtimeBridge = dynamic(
  () =>
    import("@/components/dashboard/workspace-realtime-bridge").then(
      (module) => ({
        default: module.WorkspaceRealtimeBridge,
      })
    ),
  { loading: () => null, ssr: false }
);

const DeferredUploadActivityPanel = dynamic(
  () =>
    import("@/components/files/upload-activity-panel").then((module) => ({
      default: module.UploadActivityPanel,
    })),
  { loading: () => null }
);

const DeferredDashboardOverlayHost = dynamic(
  () =>
    import("@/components/dashboard/dashboard-overlay-host").then((module) => ({
      default: module.DashboardOverlayHost,
    })),
  { loading: () => null }
);

function ReadyCommandPalette({
  workspaceUuid,
  workspaces = [],
}: {
  workspaceUuid?: string;
  workspaces?: Array<{
    logo: string | null;
    workspaceId: string;
    organizationId: string;
    rootFolderId: string;
    name: string;
  }>;
}) {
  const runtime = useCommandPalette({
    workspaceUuid,
    workspaces,
  });

  return <DeferredCommandPaletteSurface runtime={runtime} />;
}

export interface DashboardLayoutProps {
  activeChatSlug?: string;
  activeWorkspace?: {
    name?: string;
    organizationId?: string | null;
    rootFolderId: string;
    workspaceId: string;
  } | null;
  children: ReactNode;
  initialWorkspaces?: Array<{
    logo: string | null;
    workspaceId: string;
    organizationId: string;
    rootFolderId: string;
    name: string;
  }>;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export function DashboardLayout({
  user,
  activeChatSlug,
  activeWorkspace,
  initialWorkspaces,
  children: _children,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [deferredReady, setDeferredReady] = useState(false);
  const shouldMountRealtimeBridge =
    deferredReady &&
    Boolean(activeWorkspace?.workspaceId) &&
    !pathname.startsWith("/workspace/files");

  useEffect(() => {
    const documentElement = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousHtmlOverscrollBehavior =
      documentElement.style.overscrollBehavior;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;

    documentElement.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      documentElement.style.overflow = previousHtmlOverflow;
      documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
    };
  }, []);

  useEffect(() => {
    if (deferredReady || typeof window === "undefined") {
      return;
    }

    const markReady = () => {
      setDeferredReady(true);
    };

    const cleanupListeners = () => {
      window.removeEventListener("pointerdown", markReady);
      window.removeEventListener("keydown", markReady);
    };

    window.addEventListener("pointerdown", markReady, {
      once: true,
      passive: true,
    });
    window.addEventListener("keydown", markReady, { once: true });
    return () => {
      cleanupListeners();
    };
  }, [deferredReady]);

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <Suspense fallback={null}>
        <DashboardSidebar
          activeChatSlug={activeChatSlug ?? ""}
          activeWorkspace={activeWorkspace}
          initialWorkspaces={initialWorkspaces}
          user={user}
        />
      </Suspense>
      {shouldMountRealtimeBridge ? (
        <DeferredWorkspaceRealtimeBridge
          workspaceUuid={activeWorkspace?.workspaceId ?? null}
        />
      ) : null}
      <SidebarInset className="relative min-h-0 overflow-hidden bg-background md:peer-data-[variant=inset]:mb-0">
        <div className="min-h-0 flex-1 overflow-hidden">
          <WorkspacePaneRenderer />
        </div>
        {deferredReady ? (
          <>
            <DeferredQuickCaptureHost
              currentUserAvatar={user?.avatar}
              currentUserEmail={user?.email}
              currentUserId={user?.id}
              currentUserName={user?.name}
              workspaceUuid={activeWorkspace?.workspaceId}
            />
            <ReadyCommandPalette
              workspaces={initialWorkspaces}
              workspaceUuid={activeWorkspace?.workspaceId}
            />
            <DeferredUploadActivityPanel />
          </>
        ) : null}
      </SidebarInset>
      <DeferredDashboardOverlayHost
        activeWorkspace={activeWorkspace}
        initialUser={
          user
            ? {
                avatar: user.avatar ?? null,
                email: user.email,
                id: user.id,
                name: user.name,
              }
            : null
        }
        initialWorkspaces={initialWorkspaces}
      />
      <div className="hidden lg:block">
        <ChatPet />
      </div>
    </SidebarProvider>
  );
}
