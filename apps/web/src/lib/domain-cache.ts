import { invalidateRouteCache } from "@/lib/route-cache";

export const CACHE_NAMESPACES = {
  chatsList: "chats:list",
  flashcards: "flashcards",
  workspaceFolder: "workspace:folder",
  workspaceOverview: "workspace:overview",
  workspaceTree: "workspace:tree",
} as const;

export async function invalidateWorkspaceReadCaches(workspaceUuid: string) {
  await Promise.all([
    invalidateRouteCache(CACHE_NAMESPACES.workspaceOverview, workspaceUuid),
    invalidateRouteCache(CACHE_NAMESPACES.workspaceFolder, workspaceUuid),
    invalidateRouteCache(CACHE_NAMESPACES.workspaceTree, workspaceUuid),
  ]);
}

export async function invalidateChatReadCaches(workspaceUuid: string) {
  await invalidateRouteCache(CACHE_NAMESPACES.chatsList, workspaceUuid);
}

export async function invalidateFlashcardReadCaches(workspaceUuid: string) {
  await Promise.all([
    invalidateRouteCache(CACHE_NAMESPACES.flashcards, workspaceUuid),
    invalidateRouteCache(CACHE_NAMESPACES.workspaceOverview, workspaceUuid),
  ]);
}
