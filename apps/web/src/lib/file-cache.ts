export interface CachedUploadThingFile {
  key: string;
  name: string;
  size: number;
  uploadedAt: number;
  url: string;
  contentType?: string;
}

interface CachedPayload {
  cachedAt: number;
  files: CachedUploadThingFile[];
}

const DB_NAME = "avenire-file-cache";
const DB_VERSION = 1;
const STORE_NAME = "cache";
const CACHE_KEY = "uploadthing-files-v1";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidCachedFile(value: unknown): value is CachedUploadThingFile {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.key === "string" &&
    value.key.length > 0 &&
    typeof value.name === "string" &&
    typeof value.size === "number" &&
    Number.isFinite(value.size) &&
    typeof value.uploadedAt === "number" &&
    Number.isFinite(value.uploadedAt) &&
    typeof value.url === "string" &&
    value.url.startsWith("http") &&
    (typeof value.contentType === "string" || typeof value.contentType === "undefined")
  );
}

function isValidPayload(value: unknown): value is CachedPayload {
  if (!isObject(value)) {
    return false;
  }

  if (typeof value.cachedAt !== "number" || !Array.isArray(value.files)) {
    return false;
  }

  return value.files.every(isValidCachedFile);
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

    request.onsuccess = () => {
      resolve((request.result as T | undefined) ?? null);
    };
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

export async function readUploadThingCache(): Promise<CachedUploadThingFile[]> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return [];
  }

  try {
    const database = await openDb();
    const payload = await getValue<unknown>(database, CACHE_KEY);

    if (!isValidPayload(payload)) {
      return [];
    }

    return payload.files;
  } catch {
    return [];
  }
}

export async function writeUploadThingCache(files: CachedUploadThingFile[]): Promise<void> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return;
  }

  try {
    const validFiles = files.filter(isValidCachedFile);
    const database = await openDb();
    await setValue(database, CACHE_KEY, {
      cachedAt: Date.now(),
      files: validFiles,
    } satisfies CachedPayload);
  } catch {
    // Ignore cache write errors.
  }
}
