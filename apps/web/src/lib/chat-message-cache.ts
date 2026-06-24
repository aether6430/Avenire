import type { UIMessage } from "@avenire/ai/message-types";

interface CachedChatMessagesPayload {
  cachedAt: number;
  chatId: string;
  messages: UIMessage[];
}

const DB_NAME = "avenire-chat-message-cache";
const DB_VERSION = 1;
const STORE_NAME = "messages";
const MAX_MESSAGES_PER_CHAT = 500;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidMessage(value: unknown): value is UIMessage {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.role === "string" &&
    Array.isArray(value.parts)
  );
}

function isValidPayload(value: unknown): value is CachedChatMessagesPayload {
  return (
    isObject(value) &&
    typeof value.cachedAt === "number" &&
    typeof value.chatId === "string" &&
    Array.isArray(value.messages) &&
    value.messages.every(isValidMessage)
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

function getValue<T>(database: IDBDatabase, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

function setValue(database: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function deleteValue(database: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function cacheKey(chatId: string) {
  return `chat:${chatId}`;
}

export function reconcileChatMessages(
  serverMessages: UIMessage[],
  cachedMessages: UIMessage[]
): UIMessage[] {
  if (cachedMessages.length <= serverMessages.length) {
    return serverMessages;
  }

  const serverMatchesCache = serverMessages.every(
    (message, index) => cachedMessages[index]?.id === message.id
  );

  return serverMatchesCache
    ? serverMessages.concat(cachedMessages.slice(serverMessages.length))
    : serverMessages;
}

export async function readCachedChatMessages(chatId: string): Promise<UIMessage[]> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return [];
  }

  try {
    const database = await openDb();
    const payload = await getValue<unknown>(database, cacheKey(chatId));
    if (!isValidPayload(payload) || payload.chatId !== chatId) {
      return [];
    }
    return payload.messages;
  } catch {
    return [];
  }
}

export async function writeCachedChatMessages(
  chatId: string,
  messages: UIMessage[]
): Promise<void> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return;
  }

  try {
    const validMessages = messages.filter(isValidMessage).slice(-MAX_MESSAGES_PER_CHAT);
    const database = await openDb();
    await setValue(database, cacheKey(chatId), {
      cachedAt: Date.now(),
      chatId,
      messages: validMessages,
    } satisfies CachedChatMessagesPayload);
  } catch {
    // Ignore cache write errors.
  }
}

export async function deleteCachedChatMessages(chatId: string): Promise<void> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return;
  }

  try {
    const database = await openDb();
    await deleteValue(database, cacheKey(chatId));
  } catch {
    // Ignore cache delete errors.
  }
}
