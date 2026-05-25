"use client";

import type { DashboardSidebarView } from "@/components/dashboard/sidebar-startup";

export interface DashboardSidebarWorkspaceSummary {
  name: string;
  organizationId?: string;
  rootFolderId: string;
  workspaceId: string;
}

export interface DashboardSidebarInvitation {
  id: string;
  inviterEmail: string;
  inviterName: string | null;
  organizationId: string;
  organizationName: string;
}

export type DashboardSidebarMountedView = Exclude<DashboardSidebarView, null>;

export const DASHBOARD_FLASHCARDS_ROUTE_REGEX =
  /^\/workspace\/flashcards\/([^/?#]+)/;
export const DASHBOARD_FILES_FOLDER_ROUTE_REGEX =
  /^\/workspace\/files\/[^/]+\/folder\/([^/?#]+)/;

export async function sendDashboardSidebarChatSessionClose(payload: {
  chatId: string;
  sessionId: string;
}) {
  const body = JSON.stringify({
    kind: "session-close",
    chatId: payload.chatId,
    sessionId: payload.sessionId,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/chat",
      new Blob([body], { type: "application/json" })
    );
    return;
  }

  await fetch("/api/chat", {
    body,
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export async function parseDashboardSidebarResponse<T>(
  response: Response
): Promise<T | null> {
  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === "textarea" || tagName === "select") {
    return true;
  }

  if (tagName !== "input") {
    return false;
  }

  const input = target as HTMLInputElement;
  const ignoredInputTypes = new Set([
    "button",
    "checkbox",
    "color",
    "file",
    "hidden",
    "image",
    "radio",
    "range",
    "reset",
    "submit",
  ]);

  return !ignoredInputTypes.has(input.type.toLowerCase());
}

export function deriveDashboardSidebarRouteView(options: {
  isChatsRoute: boolean;
  pathname: string;
}): DashboardSidebarView {
  const { isChatsRoute, pathname } = options;

  if (pathname.startsWith("/workspace/flashcards")) {
    return "flashcards";
  }
  if (pathname.startsWith("/workspace/tasks")) {
    return "tasks";
  }
  if (pathname.startsWith("/workspace/files")) {
    return "files";
  }
  if (isChatsRoute) {
    return "chat";
  }

  return null;
}

export function deriveActiveChatSlugFromPath(pathname: string) {
  const match = pathname.match(/^\/workspace\/chats\/([^/?#]+)/);
  if (!match?.[1] || match[1] === "new") {
    return "";
  }
  return match[1];
}

export function deriveCurrentFlashcardSetId(pathname: string) {
  return pathname.match(DASHBOARD_FLASHCARDS_ROUTE_REGEX)?.[1] ?? undefined;
}

export function deriveCurrentFolderId(pathname: string) {
  return pathname.match(DASHBOARD_FILES_FOLDER_ROUTE_REGEX)?.[1] ?? undefined;
}

export function deriveRouteWorkspaceUuid(pathname: string) {
  return pathname.match(/^\/workspace\/files\/([^/]+)/)?.[1] ?? null;
}

export function resolveSidebarWorkspaceUuid(options: {
  activeChatWorkspaceId: string | null;
  activeWorkspaceId: string | null;
  preferredWorkspaceId: string | null;
  routeWorkspaceUuid: string | null;
  workspaces: DashboardSidebarWorkspaceSummary[];
}) {
  const {
    activeChatWorkspaceId,
    activeWorkspaceId,
    preferredWorkspaceId,
    routeWorkspaceUuid,
    workspaces,
  } = options;

  return (
    routeWorkspaceUuid ??
    activeWorkspaceId ??
    preferredWorkspaceId ??
    activeChatWorkspaceId ??
    workspaces[0]?.workspaceId ??
    null
  );
}

export function shouldSyncRouteWorkspacePreference(options: {
  routeWorkspaceUuid: string | null;
  storedPreferredWorkspaceId: string | null;
}) {
  const { routeWorkspaceUuid, storedPreferredWorkspaceId } = options;

  return Boolean(
    routeWorkspaceUuid && routeWorkspaceUuid !== storedPreferredWorkspaceId
  );
}

export function shouldSeedPreferredWorkspaceId(options: {
  derivedWorkspaceUuid: string | null;
  routeWorkspaceUuid: string | null;
  storedPreferredWorkspaceId: string | null;
}) {
  const {
    derivedWorkspaceUuid,
    routeWorkspaceUuid,
    storedPreferredWorkspaceId,
  } = options;

  return Boolean(
    derivedWorkspaceUuid && !routeWorkspaceUuid && !storedPreferredWorkspaceId
  );
}

export function resolveDashboardSidebarSurfaceView(options: {
  desktopSidebarView: Exclude<DashboardSidebarView, null>;
  isMobile: boolean;
  mobileSidebarView: Exclude<DashboardSidebarView, null>;
}) {
  return options.isMobile
    ? options.mobileSidebarView
    : options.desktopSidebarView;
}

export function resolveDashboardSidebarActiveTabValue(
  sidebarView: Exclude<DashboardSidebarView, null>
) {
  return sidebarView;
}

export function resolveInitialDashboardSidebarView(options: {
  activeView: DashboardSidebarView;
}) {
  return options.activeView ?? "chat";
}

export function resolveInitialMountedDashboardSidebarViews(options: {
  activeView: DashboardSidebarView;
}) {
  const initialView = options.activeView ?? "chat";

  if (initialView === "files") {
    return new Set<DashboardSidebarMountedView>();
  }

  return new Set([initialView]);
}

export function getNextMountedDashboardSidebarViews(options: {
  mountedViews: Set<DashboardSidebarMountedView>;
  sidebarView: Exclude<DashboardSidebarView, null>;
}) {
  const { mountedViews, sidebarView } = options;

  if (mountedViews.has(sidebarView)) {
    return mountedViews;
  }

  const next = new Set(mountedViews);
  next.add(sidebarView);
  return next;
}
