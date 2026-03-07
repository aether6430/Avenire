"use client";

type PreviewKind = "audio" | "image" | "pdf" | "video";
type WarmState = "cold" | "warm" | "warming";

const OPENED_FILES_MAX = 300;
const WARM_CACHE_MAX = 120;
const WARM_TTL_MS = 15 * 60 * 1000;

const openedFiles = new Map<string, number>();

interface WarmEntry {
  cleanup?: () => void;
  refs: number;
  state: WarmState;
  touchedAt: number;
}

const warmByUrl = new Map<string, WarmEntry>();

function now() {
  return Date.now();
}

function pruneOpenedFiles() {
  while (openedFiles.size > OPENED_FILES_MAX) {
    const oldest = openedFiles.keys().next().value;
    if (!oldest) {
      return;
    }
    openedFiles.delete(oldest);
  }
}

function pruneWarmCache() {
  const cutoff = now() - WARM_TTL_MS;
  for (const [url, entry] of warmByUrl.entries()) {
    if (entry.refs === 0 && entry.touchedAt < cutoff) {
      entry.cleanup?.();
      warmByUrl.delete(url);
    }
  }

  while (warmByUrl.size > WARM_CACHE_MAX) {
    const oldest = warmByUrl.keys().next().value;
    if (!oldest) {
      return;
    }
    const entry = warmByUrl.get(oldest);
    entry?.cleanup?.();
    warmByUrl.delete(oldest);
  }
}

function warmMediaMetadata(url: string, kind: "audio" | "video") {
  const media = document.createElement(kind);
  media.preload = "metadata";
  media.muted = true;
  if (kind === "video") {
    (media as HTMLVideoElement).playsInline = true;
  }

  let settled = false;
  const resolveReady = () => {
    settled = true;
    const current = warmByUrl.get(url);
    if (current) {
      current.state = "warm";
      current.cleanup = undefined;
      current.touchedAt = now();
    }
    media.remove();
  };
  const resolveFailure = () => {
    settled = true;
    const current = warmByUrl.get(url);
    if (current && current.refs === 0) {
      warmByUrl.delete(url);
    } else if (current) {
      current.state = "cold";
      current.cleanup = undefined;
      current.touchedAt = now();
    }
    media.remove();
  };

  const onReady = () => resolveReady();
  const onError = () => resolveFailure();

  media.addEventListener("loadedmetadata", onReady, { once: true });
  media.addEventListener("error", onError, { once: true });
  media.src = url;
  media.load();

  return () => {
    if (settled) {
      return;
    }
    media.removeEventListener("loadedmetadata", onReady);
    media.removeEventListener("error", onError);
    media.src = "";
    media.load();
    media.remove();
  };
}

export function markFileOpened(fileId: string) {
  openedFiles.delete(fileId);
  openedFiles.set(fileId, now());
  pruneOpenedFiles();
}

export function isFileOpenedCached(fileId: string) {
  return openedFiles.has(fileId);
}

export async function primeFilePreview(url: string, kind: PreviewKind) {
  if (typeof window === "undefined" || !url) {
    return;
  }

  pruneWarmCache();

  const existing = warmByUrl.get(url);
  if (existing) {
    existing.refs += 1;
    existing.touchedAt = now();
    return;
  }

  const entry: WarmEntry = {
    refs: 1,
    state: "warming",
    touchedAt: now(),
  };
  warmByUrl.set(url, entry);

  if (kind === "audio" || kind === "video") {
    entry.cleanup = warmMediaMetadata(url, kind);
  } else {
    entry.state = "warm";
  }
}

export function releasePreviewPrime(url: string) {
  const entry = warmByUrl.get(url);
  if (!entry) {
    return;
  }

  entry.refs = Math.max(0, entry.refs - 1);
  entry.touchedAt = now();

  if (entry.refs > 0) {
    return;
  }

  if (entry.state === "warming") {
    entry.cleanup?.();
    warmByUrl.delete(url);
    return;
  }

  pruneWarmCache();
}

export function getWarmState(url: string): WarmState {
  const entry = warmByUrl.get(url);
  if (!entry) {
    return "cold";
  }

  if (entry.refs === 0 && entry.touchedAt < now() - WARM_TTL_MS) {
    entry.cleanup?.();
    warmByUrl.delete(url);
    return "cold";
  }

  return entry.state;
}
