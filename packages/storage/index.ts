import { randomUUID } from "node:crypto";
import { type Body, Files as FilesClient, type UploadOptions } from "files-sdk";
import { uploadthing } from "files-sdk/uploadthing";
import { createUploadthing } from "uploadthing/next";

export {
  type Body,
  Files,
  type StoredFile,
  type UploadOptions,
} from "files-sdk";
export { uploadthing } from "files-sdk/uploadthing";
export { createRouteHandler, type FileRouter } from "uploadthing/next";
export {
  extractRouterConfig,
  UploadThingError as UploadError,
  UTApi,
} from "uploadthing/server";

export const storage: ReturnType<typeof createUploadthing> =
  createUploadthing();

export interface StorageUploadResult {
  contentType: string;
  etag?: string;
  key: string;
  lastModified?: number;
  size: number;
  url: string;
}

export interface UploadStorageFileInput {
  body: Body;
  contentType?: string | null;
  key?: string;
  name: string;
}

const CUSTOM_ID_PREFIX = "uploads/";

function getUploadThingFiles() {
  return new FilesClient({
    adapter: uploadthing({
      acl: "public-read",
      token: process.env.UPLOADTHING_TOKEN,
    }),
  });
}

function normalizeFileName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "file";
  }
  return trimmed.replace(/[/\\]/g, "-").replace(/\s+/g, " ").slice(0, 180);
}

export function createStorageKey(name: string) {
  return `${CUSTOM_ID_PREFIX}${randomUUID()}-${normalizeFileName(name)}`;
}

export function isFilesSdkStorageKey(key: string) {
  return key.startsWith(CUSTOM_ID_PREFIX);
}

export async function getStorageUrl(key: string) {
  if (!key) {
    return "";
  }

  const { UTApi } = await import("uploadthing/server");
  const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });
  const options: { keyType: "customId" } | undefined =
    isFilesSdkStorageKey(key) ? { keyType: "customId" } : undefined;
  const response = await utapi.getFileUrls([key], options);
  return response.data[0]?.url ?? "";
}

export async function uploadStorageFile(
  input: UploadStorageFileInput
): Promise<StorageUploadResult> {
  const key = input.key ?? createStorageKey(input.name);
  const options: UploadOptions = input.contentType
    ? { contentType: input.contentType }
    : {};
  const files = getUploadThingFiles();
  const result = await files.upload(key, input.body, options);
  return {
    ...result,
    url: await getStorageUrl(result.key),
  };
}

export async function deleteStorageFiles(keys: string[]) {
  const normalized = Array.from(
    new Set(keys.filter((key) => key && !key.startsWith("virtual:")))
  );
  if (normalized.length === 0 || !process.env.UPLOADTHING_TOKEN) {
    return;
  }

  const files = getUploadThingFiles();
  const filesSdkKeys = normalized.filter(isFilesSdkStorageKey);
  const legacyKeys = normalized.filter((key) => !isFilesSdkStorageKey(key));

  await Promise.all([
    ...filesSdkKeys.map((key) => files.delete(key).catch(() => undefined)),
    (async () => {
      if (legacyKeys.length === 0) {
        return;
      }
      const { UTApi } = await import("uploadthing/server");
      const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });
      await utapi.deleteFiles(legacyKeys).catch(() => undefined);
    })(),
  ]);
}
