"use client";

import type { PageMetadataState } from "@/lib/frontmatter";
import {
  readBrowserCache,
  removeBrowserCache,
  writeBrowserCache,
} from "@/lib/browser-cache";

const MAX_MARKDOWN_CACHE_ENTRIES = 240;

interface CachedWorkspaceMarkdownPayload {
  body: string;
  cachedAt: number;
  content: string;
  page: PageMetadataState;
  updatedAt: string | null;
}

const markdownByKey = new Map<string, CachedWorkspaceMarkdownPayload>();
const CACHE_PREFIX = "avenire-workspace-markdown-cache:v1:";

function cacheKey(workspaceUuid: string, fileId: string) {
  return `${CACHE_PREFIX}${workspaceUuid}:${fileId}`;
}

function pruneMarkdownCache() {
  while (markdownByKey.size > MAX_MARKDOWN_CACHE_ENTRIES) {
    const oldest = markdownByKey.keys().next().value;
    if (!oldest) {
      return;
    }
    markdownByKey.delete(oldest);
  }
}

export function readWorkspaceMarkdownCache(
  workspaceUuid: string,
  fileId: string
) {
  const key = cacheKey(workspaceUuid, fileId);
  const cached = markdownByKey.get(key);
  if (cached) {
    return {
      body: cached.body,
      cachedAt: cached.cachedAt,
      content: cached.content,
      page: cached.page,
      updatedAt: cached.updatedAt,
    };
  }

  const persisted = readBrowserCache(
    key,
    (value): value is CachedWorkspaceMarkdownPayload =>
      Boolean(
        value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          typeof (value as { cachedAt?: unknown }).cachedAt === "number" &&
          typeof (value as { body?: unknown }).body === "string" &&
          typeof (value as { content?: unknown }).content === "string" &&
          ((value as { updatedAt?: unknown }).updatedAt === null ||
            typeof (value as { updatedAt?: unknown }).updatedAt === "string")
      )
  );

  if (!persisted) {
    return null;
  }

  markdownByKey.set(key, persisted);
  return {
    body: persisted.body,
    cachedAt: persisted.cachedAt,
    content: persisted.content,
    page: persisted.page,
    updatedAt: persisted.updatedAt,
  };
}

export function writeWorkspaceMarkdownCache(
  workspaceUuid: string,
  fileId: string,
  payload: {
    body: string;
    content: string;
    page: PageMetadataState;
    updatedAt?: string | null;
  }
) {
  const key = cacheKey(workspaceUuid, fileId);
  const next = {
    body: payload.body,
    cachedAt: Date.now(),
    content: payload.content,
    page: payload.page,
    updatedAt: payload.updatedAt ?? null,
  } satisfies CachedWorkspaceMarkdownPayload;

  markdownByKey.set(key, next);
  writeBrowserCache(key, next);
  pruneMarkdownCache();
}

export function invalidateWorkspaceMarkdownCache(
  workspaceUuid: string,
  fileId?: string | null
) {
  if (fileId) {
    const key = cacheKey(workspaceUuid, fileId);
    markdownByKey.delete(key);
    removeBrowserCache(key);
    return;
  }

  const prefix = `${CACHE_PREFIX}${workspaceUuid}:`;
  for (const key of markdownByKey.keys()) {
    if (key.startsWith(prefix)) {
      markdownByKey.delete(key);
      removeBrowserCache(key);
    }
  }
}
