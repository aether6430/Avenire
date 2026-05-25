"use client";

export type { PreviewKind, WarmState } from "@/lib/file-preview-cache-model";
export {
  buildWarmFetchInit,
  getEntryKey,
  parsePlaylistUris,
  parseWarmMediaUrls,
  shouldCachePreviewBlob,
} from "@/lib/file-preview-cache-model";
export {
  getCachedPreviewUrl,
  getPlaybackCacheKey,
  getWarmState,
  isFileOpenedCached,
  markFileOpened,
  primeFilePreview,
  primeMediaPlayback,
  releaseMediaPlaybackPrime,
  releasePreviewPrime,
  resolveCachedPlaybackSource,
} from "@/lib/file-preview-cache-runtime";
