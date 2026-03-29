"use client";

import type { ChatSummary } from "@/lib/chat-data";
import type { FlashcardSetSummary } from "@/lib/flashcards";
import type { WorkspaceTask } from "@/lib/tasks";
import { readBrowserCache, writeBrowserCache } from "@/lib/browser-cache";

interface CachedListPayload<T> {
  cachedAt: number;
  items: T[];
  workspaceUuid: string;
}

interface CachedWorkspaceSummary {
  name: string;
  organizationId: string;
  rootFolderId: string;
  workspaceId: string;
}

function cacheKey(namespace: string, workspaceUuid: string) {
  return `avenire:${namespace}:${workspaceUuid}`;
}

const WORKSPACE_LIST_CACHE_KEY = "avenire:workspaces:list";

function isChatSummary(value: unknown): value is ChatSummary {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.slug === "string" &&
    typeof record.title === "string" &&
    typeof record.workspaceId === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    typeof record.lastMessageAt === "string"
  );
}

function isFlashcardSetSummary(value: unknown): value is FlashcardSetSummary {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  );
}

function isTaskSummary(value: unknown): value is WorkspaceTask {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const assignee = record.assignee;
  const validAssignee =
    assignee === null ||
    assignee === undefined ||
    (typeof assignee === "object" &&
      !Array.isArray(assignee) &&
      typeof (assignee as { userId?: unknown }).userId === "string" &&
      typeof (assignee as { email?: unknown }).email === "string");

  return (
    typeof record.id === "string" &&
    typeof record.workspaceId === "string" &&
    typeof record.userId === "string" &&
    typeof record.title === "string" &&
    typeof record.status === "string" &&
    typeof record.createdBy === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    validAssignee
  );
}

function isCachedListPayload<T>(
  value: unknown,
  validator: (entry: unknown) => entry is T
): value is CachedListPayload<T> {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.cachedAt === "number" &&
    typeof record.workspaceUuid === "string" &&
    Array.isArray(record.items) &&
    record.items.every(validator)
  );
}

export function readCachedChats(workspaceUuid: string) {
  const payload = readBrowserCache(
    cacheKey("chats", workspaceUuid),
    (value): value is CachedListPayload<ChatSummary> =>
      isCachedListPayload(value, isChatSummary)
  );
  return payload?.items ?? null;
}

export function writeCachedChats(workspaceUuid: string, chats: ChatSummary[]) {
  writeBrowserCache(cacheKey("chats", workspaceUuid), {
    cachedAt: Date.now(),
    items: chats,
    workspaceUuid,
  } satisfies CachedListPayload<ChatSummary>);
}

export function readCachedFlashcardSets(workspaceUuid: string) {
  const payload = readBrowserCache(
    cacheKey("flashcards", workspaceUuid),
    (value): value is CachedListPayload<FlashcardSetSummary> =>
      isCachedListPayload(value, isFlashcardSetSummary)
  );
  return payload?.items ?? null;
}

export function writeCachedFlashcardSets(
  workspaceUuid: string,
  sets: FlashcardSetSummary[]
) {
  writeBrowserCache(cacheKey("flashcards", workspaceUuid), {
    cachedAt: Date.now(),
    items: sets,
    workspaceUuid,
  } satisfies CachedListPayload<FlashcardSetSummary>);
}

export function readCachedTasks(workspaceUuid: string) {
  const payload = readBrowserCache(
    cacheKey("tasks", workspaceUuid),
    (value): value is CachedListPayload<WorkspaceTask> =>
      isCachedListPayload(value, isTaskSummary)
  );
  return payload?.items ?? null;
}

export function writeCachedTasks(workspaceUuid: string, tasks: WorkspaceTask[]) {
  writeBrowserCache(cacheKey("tasks", workspaceUuid), {
    cachedAt: Date.now(),
    items: tasks,
    workspaceUuid,
  } satisfies CachedListPayload<WorkspaceTask>);
}

export function readCachedWorkspaces() {
  const payload = readBrowserCache(
    WORKSPACE_LIST_CACHE_KEY,
    (value): value is {
      cachedAt: number;
      workspaces: CachedWorkspaceSummary[];
    } =>
      Boolean(
        value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          typeof (value as { cachedAt?: unknown }).cachedAt === "number" &&
          Array.isArray((value as { workspaces?: unknown }).workspaces) &&
          (value as { workspaces?: unknown[] }).workspaces!.every(
            (entry) =>
              Boolean(
                entry &&
                  typeof entry === "object" &&
                  !Array.isArray(entry) &&
                  typeof (entry as { workspaceId?: unknown }).workspaceId ===
                    "string" &&
                  typeof (entry as { organizationId?: unknown }).organizationId ===
                    "string" &&
                  typeof (entry as { rootFolderId?: unknown }).rootFolderId ===
                    "string" &&
                  typeof (entry as { name?: unknown }).name === "string"
              )
          )
      )
  );

  return payload?.workspaces ?? null;
}

export function writeCachedWorkspaces(
  workspaces: CachedWorkspaceSummary[]
) {
  writeBrowserCache(WORKSPACE_LIST_CACHE_KEY, {
    cachedAt: Date.now(),
    workspaces,
  });
}
