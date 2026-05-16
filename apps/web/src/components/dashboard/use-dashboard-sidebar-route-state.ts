"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  deriveActiveChatSlugFromPath,
  deriveCurrentFlashcardSetId,
  deriveCurrentFolderId,
  deriveDashboardSidebarRouteView,
  deriveRouteWorkspaceUuid,
} from "@/components/dashboard/dashboard-sidebar-runtime-model";

export function useDashboardSidebarRouteState() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isChatsRoute =
    pathname === "/workspace/chats" || pathname.startsWith("/workspace/chats/");
  const activeView = useMemo(
    () =>
      deriveDashboardSidebarRouteView({
        isChatsRoute,
        pathname,
      }),
    [isChatsRoute, pathname]
  );
  const activeChatSlugFromPath = useMemo(
    () => deriveActiveChatSlugFromPath(pathname),
    [pathname]
  );
  const currentFlashcardSetId = useMemo(
    () => deriveCurrentFlashcardSetId(pathname),
    [pathname]
  );
  const currentFolderId = useMemo(
    () => deriveCurrentFolderId(pathname),
    [pathname]
  );
  const routeWorkspaceUuid = useMemo(
    () => deriveRouteWorkspaceUuid(pathname),
    [pathname]
  );
  const currentFileId = searchParams.get("file") ?? undefined;

  return {
    activeChatSlugFromPath,
    activeView,
    currentFileId,
    currentFlashcardSetId,
    currentFolderId,
    isChatsRoute,
    pathname,
    routeWorkspaceUuid,
    searchParams,
  };
}
