export type DashboardSidebarView =
  | "chat"
  | "files"
  | "flashcards"
  | "tasks"
  | null;

export function shouldWarmAllWorkspaceSurfacesOnStartup(
  _activeView: DashboardSidebarView
) {
  return false;
}

export function shouldLoadChatsForSidebar(options: {
  isChatsRoute: boolean;
  sidebarView: DashboardSidebarView;
}) {
  return options.isChatsRoute || options.sidebarView === "chat";
}

export function shouldLoadWorkspaceListOnStartup(options: {
  bootstrapStatus: "error" | "loading" | "ready" | "unauthorized";
  deferredStartupReady: boolean;
  initialWorkspaceCount: number;
  workspaceCount: number;
}) {
  return (
    options.deferredStartupReady &&
    options.initialWorkspaceCount === 0 &&
    options.workspaceCount === 0 &&
    options.bootstrapStatus !== "loading"
  );
}
