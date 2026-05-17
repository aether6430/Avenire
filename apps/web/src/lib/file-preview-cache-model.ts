"use client";

import type { MediaPlaybackSource } from "@avenire/ui/media";
import { getPlaybackSourceCacheKey } from "@/lib/media-playback";

export type PreviewKind = "audio" | "image" | "pdf" | "video";
export type WarmState = "cold" | "warm" | "warming";

const PREVIEW_BLOB_CACHE_MAX_BYTES = 48 * 1024 * 1024;
const HLS_MAP_URI_PATTERN = /#EXT-X-MAP:.*URI="([^"]+)"/;
const PLAYLIST_LINE_SPLIT_PATTERN = /\r?\n/;

export function getEntryKey(input: MediaPlaybackSource | string) {
  return typeof input === "string"
    ? `progressive:${input}`
    : getPlaybackSourceCacheKey(input);
}

export function shouldCachePreviewBlob(
  mediaType: "audio" | "video" | null,
  sizeBytes?: number | null
) {
  return (
    mediaType === "video" &&
    typeof sizeBytes === "number" &&
    sizeBytes > 0 &&
    sizeBytes <= PREVIEW_BLOB_CACHE_MAX_BYTES
  );
}

export function buildWarmFetchInit(signal?: AbortSignal): RequestInit {
  return {
    cache: "force-cache",
    credentials: "same-origin",
    ...(signal ? { signal } : {}),
  };
}

export function parsePlaylistUris(playlistText: string, baseUrl: string) {
  return playlistText
    .split(PLAYLIST_LINE_SPLIT_PATTERN)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => new URL(line, baseUrl).toString());
}

export function parseMapUri(playlistText: string, baseUrl: string) {
  const match = playlistText.match(HLS_MAP_URI_PATTERN);
  if (!match?.[1]) {
    return null;
  }
  return new URL(match[1], baseUrl).toString();
}

export function parseWarmMediaUrls(playlistText: string, baseUrl: string) {
  const urls = parsePlaylistUris(playlistText, baseUrl).slice(0, 2);
  const initUrl = parseMapUri(playlistText, baseUrl);
  return initUrl ? [initUrl, ...urls] : urls;
}
