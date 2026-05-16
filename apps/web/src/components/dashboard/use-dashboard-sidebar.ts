"use client";

import { useSidebar } from "@avenire/ui/components/sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDashboardSidebarChats } from "@/components/dashboard/use-dashboard-sidebar-chats";
import { useDashboardSidebarHotkeys } from "@/components/dashboard/use-dashboard-sidebar-hotkeys";
import { useDashboardSidebarOverlayActions } from "@/components/dashboard/use-dashboard-sidebar-overlay-actions";
import { useDashboardSidebarPeek } from "@/components/dashboard/use-dashboard-sidebar-peek";
import { useDashboardSidebarPreferredWorkspace } from "@/components/dashboard/use-dashboard-sidebar-preferred-workspace";
import { useDashboardSidebarRouteState } from "@/components/dashboard/use-dashboard-sidebar-route-state";
import { useDashboardSidebarStartup } from "@/components/dashboard/use-dashboard-sidebar-startup";
import { useDashboardSidebarViewState } from "@/components/dashboard/use-dashboard-sidebar-view-state";
import { useDashboardSidebarWarmup } from "@/components/dashboard/use-dashboard-sidebar-warmup";
import { useDashboardSidebarWorkspaces } from "@/components/dashboard/use-dashboard-sidebar-workspaces";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { useHaptics } from "@/hooks/use-haptics";
import type { ChatSummary } from "@/lib/chat-data";
import {
  primeWorkspaceTaskStore,
  reloadWorkspaceTasks,
} from "@/lib/task-client-store";
import { useWorkspaceSurfaceNavigation } from "@/lib/workspace-panes";
import { useDashboardOverlayStore } from "@/stores/dashboardOverlayStore";

export function useDashboardSidebar({
  activeWorkspace,
  activeChatSlug: activeChatSlugProp,
  initialChats,
  initialWorkspaces,
}: {
  activeWorkspace?: {
    name?: string;
    organizationId?: string | null;
    rootFolderId: string;
    workspaceId: string;
  } | null;
  activeChatSlug?: string;
  initialChats: ChatSummary[];
  initialWorkspaces: Array<{
    workspaceId: string;
    organizationId: string;
    rootFolderId: string;
    name: string;
  }>;
}) {
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar();
  const { status: workspaceBootstrapStatus } = useWorkspaceBootstrap();
  const { navigate } = useWorkspaceSurfaceNavigation({
    panesEnabled: !isMobile,
  });
  const triggerHaptic = useHaptics();
  const router = useRouter();
  const setTrashOpen = useDashboardOverlayStore(
    (overlayState) => overlayState.setTrashOpen
  );
  const {
    activeChatSlugFromPath,
    activeView,
    currentFileId,
    currentFlashcardSetId,
    currentFolderId,
    isChatsRoute,
    pathname,
    routeWorkspaceUuid,
    searchParams,
  } = useDashboardSidebarRouteState();
  const { closePeekSidebar, isPeekabooActive, openPeekSidebar } =
    useDashboardSidebarPeek({
      isMobile,
      state,
    });
  const { deferredStartupReady } = useDashboardSidebarStartup();
  const {
    activeTabValue,
    desktopSidebarView,
    mobileSidebarView,
    mountedViews,
    setDesktopSidebarView,
    setMobileSidebarView,
    sidebarView,
  } = useDashboardSidebarViewState({
    activeView,
    isMobile,
  });
  const [workspaceUuid, setWorkspaceUuid] = useState<string | null>(
    activeWorkspace?.workspaceId ?? null
  );

  const workspaceRuntime = useDashboardSidebarWorkspaces({
    activeWorkspace,
    deferredStartupReady,
    initialWorkspaces,
    navigate,
    pathname,
    routeWorkspaceUuid,
    workspaceBootstrapStatus,
  });

  const chatsRuntime = useDashboardSidebarChats({
    activeChatSlugFromPath,
    activeChatSlugProp,
    activeWorkspaceId: activeWorkspace?.workspaceId ?? null,
    initialChats,
    isChatsRoute,
    navigate,
    pathname,
    refreshRoute: () => router.refresh(),
    routeView: activeView,
    sidebarView,
    workspaceUuid,
  });

  const activeChatWorkspaceId = chatsRuntime.activeChatSlug
    ? (chatsRuntime.chats.find(
        (chat) => chat.slug === chatsRuntime.activeChatSlug
      )?.workspaceId ?? null)
    : null;

  useDashboardSidebarPreferredWorkspace({
    activeChatWorkspaceId,
    activeWorkspaceId: activeWorkspace?.workspaceId ?? null,
    routeWorkspaceUuid,
    setWorkspaceUuid,
    workspaces: workspaceRuntime.workspaces,
  });

  useEffect(() => {
    if (!(activeView === "tasks" && activeWorkspace?.workspaceId)) {
      return;
    }

    primeWorkspaceTaskStore(activeWorkspace.workspaceId);
    void reloadWorkspaceTasks(activeWorkspace.workspaceId, {
      background: true,
    });
  }, [activeView, activeWorkspace?.workspaceId]);
  const { warmWorkspaceSection } = useDashboardSidebarWarmup({
    activeView,
    currentFolderId,
    deferredStartupReady,
    primaryChatRoute: chatsRuntime.primaryChatRoute,
    primaryFilesRoute: workspaceRuntime.primaryFilesRoute,
    rootFolderId: activeWorkspace?.rootFolderId ?? null,
    routerPrefetch: router.prefetch.bind(router),
    workspaceUuid,
  });

  const { closeMobileSidebar, openSettings, openTrash, openUploadActivity } =
    useDashboardSidebarOverlayActions({
      isMobile,
      pathname,
      router,
      searchParams,
      setOpenMobile,
      setTrashOpen,
      triggerHaptic,
    });

  useDashboardSidebarHotkeys({
    activeChatSlug: chatsRuntime.activeChatSlug,
    activeView,
    chats: chatsRuntime.chats,
    createChat: chatsRuntime.createChat,
    isChatsRoute,
    navigate,
    navigateToFilesRoot: workspaceRuntime.navigateToFilesRoot,
    pathname,
    resetEditingChat: () => {
      chatsRuntime.setEditingChatSlug(null);
      chatsRuntime.setEditingTitle("");
    },
  });

  return {
    activeChatSlug: chatsRuntime.activeChatSlug,
    activeTabValue,
    activeView,
    activeWorkspace,
    chatActionStatus: chatsRuntime.chatActionStatus,
    chatsLoadFailed: chatsRuntime.chatsLoadFailed,
    chatsLoading: chatsRuntime.chatsLoading,
    chatSearchQuery: chatsRuntime.chatSearchQuery,
    chats: chatsRuntime.chats,
    closeMobileSidebar,
    closePeekSidebar,
    createChat: chatsRuntime.createChat,
    createWorkspace: workspaceRuntime.createWorkspace,
    currentFileId,
    currentFlashcardSetId,
    currentFolderId,
    deferredStartupReady,
    deleteChat: chatsRuntime.deleteChat,
    desktopSidebarView,
    editingChatSlug: chatsRuntime.editingChatSlug,
    editingTitle: chatsRuntime.editingTitle,
    filteredOtherChats: chatsRuntime.filteredOtherChats,
    filteredPinnedChats: chatsRuntime.filteredPinnedChats,
    isChatSearchOpen: chatsRuntime.isChatSearchOpen,
    invitations: workspaceRuntime.invitations,
    invitationsLoadFailed: workspaceRuntime.invitationsLoadFailed,
    invitationsLoading: workspaceRuntime.invitationsLoading,
    isChatsRoute,
    isMobile,
    isPeekabooActive,
    loadInvitations: workspaceRuntime.loadInvitations,
    loadWorkspaces: workspaceRuntime.loadWorkspaces,
    mountedViews,
    mobileSidebarView,
    navigate,
    navigateToFilesRoot: workspaceRuntime.navigateToFilesRoot,
    openPeekSidebar,
    openSettings,
    openTrash,
    openUploadActivity,
    otherChats: chatsRuntime.otherChats,
    pendingChatSlug: chatsRuntime.pendingChatSlug,
    pinnedChats: chatsRuntime.pinnedChats,
    primaryChatRoute: chatsRuntime.primaryChatRoute,
    primaryFilesRoute: workspaceRuntime.primaryFilesRoute,
    respondToInvitation: workspaceRuntime.respondToInvitation,
    routeWorkspaceUuid,
    router,
    searchParams,
    setActiveChatSlugOverride: chatsRuntime.setActiveChatSlugOverride,
    setChatSearchQuery: chatsRuntime.setChatSearchQuery,
    setDesktopSidebarView,
    setEditingChatSlug: chatsRuntime.setEditingChatSlug,
    setEditingTitle: chatsRuntime.setEditingTitle,
    setMobileSidebarView,
    sidebarView,
    state,
    switchWorkspace: workspaceRuntime.switchWorkspace,
    toggleSidebar,
    triggerHaptic,
    toggleChatSearch: chatsRuntime.toggleChatSearch,
    updateChat: chatsRuntime.updateChat,
    warmWorkspaceSection,
    workspaceActionStatus: workspaceRuntime.workspaceActionStatus,
    workspaceBootstrapStatus,
    workspaceUuid,
    workspaces: workspaceRuntime.workspaces,
    workspacesLoadFailed: workspaceRuntime.workspacesLoadFailed,
    workspacesLoading: workspaceRuntime.workspacesLoading,
  };
}

export type DashboardSidebarRuntime = ReturnType<typeof useDashboardSidebar>;
