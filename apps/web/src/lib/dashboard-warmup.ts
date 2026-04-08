"use client";

import type { Route } from "next";
import type { ChatSummary } from "@/lib/chat-data";
import {
  writeCachedChats,
  writeCachedFlashcardSets,
  writeCachedWorkspaces,
} from "@/lib/dashboard-browser-cache";
import type { FlashcardSetSummary } from "@/lib/flashcards";

interface CachedWorkspaceSummary {
  name: string;
  organizationId: string;
  rootFolderId: string;
  workspaceId: string;
}

interface WarmupContext {
  currentFolderId?: string | null;
  rootFolderId?: string | null;
  workspaceUuid: string | null;
}

const inFlightWarmups = new Map<string, Promise<void>>();

function canWarmBackground() {
  if (typeof window === "undefined") {
    return false;
  }

  const connection = (
    navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        saveData?: boolean;
      };
    }
  ).connection;
  if (connection?.saveData) {
    return false;
  }

  return (
    connection?.effectiveType !== "slow-2g" &&
    connection?.effectiveType !== "2g"
  );
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...init,
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

function rememberWarmup(key: string, task: () => Promise<void>) {
  const existing = inFlightWarmups.get(key);
  if (existing) {
    return existing;
  }

  const next = task().finally(() => {
    if (inFlightWarmups.get(key) === next) {
      inFlightWarmups.delete(key);
    }
  });

  inFlightWarmups.set(key, next);
  return next;
}

function warmWorkspacesList() {
  return rememberWarmup("workspaces:list", async () => {
    const payload = await fetchJson<{ workspaces?: CachedWorkspaceSummary[] }>(
      "/api/workspaces/list"
    );
    writeCachedWorkspaces(payload?.workspaces ?? []);
  });
}

function warmChats(workspaceUuid: string) {
  return rememberWarmup(`chats:${workspaceUuid}`, async () => {
    const payload = await fetchJson<{ chats?: ChatSummary[] }>(
      "/api/chat/history"
    );
    writeCachedChats(workspaceUuid, payload?.chats ?? []);
  });
}

function warmFlashcardSets(workspaceUuid: string) {
  return rememberWarmup(`flashcards:${workspaceUuid}`, async () => {
    const payload = await fetchJson<{ sets?: FlashcardSetSummary[] }>(
      "/api/flashcards/sets"
    );
    writeCachedFlashcardSets(workspaceUuid, payload?.sets ?? []);
  });
}

export async function warmDashboardBackground(context: WarmupContext) {
  if (!canWarmBackground()) {
    return;
  }

  const { workspaceUuid } = context;
  await Promise.allSettled([
    warmWorkspacesList(),
    workspaceUuid ? warmChats(workspaceUuid) : Promise.resolve(),
    workspaceUuid ? warmFlashcardSets(workspaceUuid) : Promise.resolve(),
  ]);
}

export async function warmWorkspaceSurface(
  surface: "chat" | "flashcards" | "files",
  context: WarmupContext
) {
  if (!canWarmBackground()) {
    return;
  }

  const { workspaceUuid } = context;

  if (surface === "chat") {
    await Promise.allSettled([
      warmWorkspacesList(),
      workspaceUuid ? warmChats(workspaceUuid) : Promise.resolve(),
    ]);
    return;
  }

  if (surface === "flashcards") {
    await Promise.allSettled([
      warmWorkspacesList(),
      workspaceUuid ? warmFlashcardSets(workspaceUuid) : Promise.resolve(),
    ]);
    return;
  }

  await Promise.allSettled([warmWorkspacesList()]);
}

export function warmDashboardRoutes(router: {
  prefetch: (href: Route) => void;
}) {
  router.prefetch("/workspace/chats" as Route);
  router.prefetch("/workspace/flashcards" as Route);
  router.prefetch("/workspace/files" as Route);
}
