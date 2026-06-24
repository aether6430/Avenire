"use client";

import type { ChatSummary } from "@/lib/chat-data";

interface CachedChatListPayload {
  cachedAt: number;
  chats: ChatSummary[];
  workspaceUuid: string;
}

const DB_NAME = "avenire-chat-list-cache";
const DB_VERSION = 1;
const STORE_NAME = "chat-lists";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isChatSummary(value: unknown): value is ChatSummary {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.slug === "string" &&
    typeof value.title === "string" &&
    typeof value.workspaceId === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    typeof value.lastMessageAt === "string"
  );
}

function isPayload(value: unknown): value is CachedChatListPayload {
  return (
    isObject(value) &&
    typeof value.cachedAt === "number" &&
    typeof value.workspaceUuid === "string" &&
    Array.isArray(value.chats) &&
    value.chats.every(isChatSummary)
  );
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function key(workspaceUuid: string) {
  return `workspace:${workspaceUuid}`;
}

export async function readIndexedCachedChats(
  workspaceUuid: string
): Promise<ChatSummary[] | null> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return null;
  }

  try {
    const database = await openDb();
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(key(workspaceUuid));
      request.onsuccess = () => {
        const payload = request.result as unknown;
        resolve(isPayload(payload) && payload.workspaceUuid === workspaceUuid ? payload.chats : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function writeIndexedCachedChats(
  workspaceUuid: string,
  chats: ChatSummary[]
): Promise<void> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return;
  }

  try {
    const database = await openDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const request = transaction.objectStore(STORE_NAME).put(
        { cachedAt: Date.now(), chats, workspaceUuid } satisfies CachedChatListPayload,
        key(workspaceUuid)
      );
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Ignore cache write errors.
  }
}
