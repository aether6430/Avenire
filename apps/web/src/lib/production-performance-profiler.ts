const INTERACTION_DURATION_THRESHOLD_MS = 80;
const MAX_PROFILES_PER_KIND = 20;
const NEXT_CHUNK_PREFIX = "/_next/static/chunks/";

export type PerformanceProfileCapture = (
  event: "web.performance.import" | "web.performance.interaction",
  properties: Record<string, unknown>
) => void;

interface StartPerformanceProfilerInput {
  capture: PerformanceProfileCapture;
  getPath: () => string;
}

interface ResourceProfileEntry {
  duration: number;
  initiatorType: string;
  name: string;
  transferSize: number;
}

type InteractionProfileEntry = Pick<
  PerformanceEntry,
  "duration" | "entryType" | "name"
>;

function normalizeChunkPath(name: string) {
  try {
    const url = new URL(name, window.location.origin);
    if (
      url.origin !== window.location.origin ||
      !url.pathname.startsWith(NEXT_CHUNK_PREFIX) ||
      !url.pathname.endsWith(".js")
    ) {
      return null;
    }
    return url.pathname;
  } catch {
    return null;
  }
}

function readInteractionTarget(entry: InteractionProfileEntry) {
  if (!("target" in entry && entry.target instanceof Element)) {
    return null;
  }
  return entry.target;
}

export function classifyInteractionSurface(
  target: Element | null,
  path: string
) {
  const declaredSurface = target
    ?.closest<HTMLElement>("[data-performance-surface]")
    ?.dataset.performanceSurface?.trim();
  if (declaredSurface) {
    return declaredSurface.slice(0, 50);
  }

  if (target?.closest('[aria-label="Editor content"]')) {
    return "editor";
  }
  if (target?.closest('[data-slot="sidebar"]')) {
    return "sidebar";
  }

  const label = target
    ?.closest<HTMLElement>("[aria-label]")
    ?.getAttribute("aria-label");
  if (label?.startsWith("Upload ")) {
    return "uploads";
  }
  if (path.includes("/chats/")) {
    return "chat";
  }
  if (path.includes("/files/")) {
    return "files";
  }
  return "workspace";
}

export function buildImportProfile(
  entry: ResourceProfileEntry,
  path: string
) {
  const resourcePath = normalizeChunkPath(entry.name);
  if (!resourcePath) {
    return null;
  }

  return {
    cached: entry.transferSize === 0,
    durationMs: Math.max(0, Math.round(entry.duration)),
    initiatorType: entry.initiatorType.slice(0, 30),
    path,
    resourcePath,
    transferSize: Math.max(0, Math.round(entry.transferSize)),
  };
}

export function buildInteractionProfile(
  entry: InteractionProfileEntry,
  path: string
) {
  if (
    entry.entryType !== "event" ||
    entry.duration < INTERACTION_DURATION_THRESHOLD_MS
  ) {
    return null;
  }

  return {
    durationMs: Math.max(0, Math.round(entry.duration)),
    interactionType: entry.name.slice(0, 30),
    path,
    surface: classifyInteractionSurface(readInteractionTarget(entry), path),
  };
}

export function startProductionPerformanceProfiler({
  capture,
  getPath,
}: StartPerformanceProfilerInput) {
  if (typeof PerformanceObserver === "undefined") {
    return () => undefined;
  }

  let importProfileCount = 0;
  let interactionProfileCount = 0;
  const observers: PerformanceObserver[] = [];

  try {
    const interactionObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (interactionProfileCount >= MAX_PROFILES_PER_KIND) {
          break;
        }
        const profile = buildInteractionProfile(entry, getPath());
        if (profile) {
          interactionProfileCount += 1;
          capture("web.performance.interaction", profile);
        }
      }
    });
    interactionObserver.observe({
      buffered: false,
      type: "event",
    });
    observers.push(interactionObserver);
  } catch {
    // Event Timing is not available in every supported browser.
  }

  try {
    const importObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntriesByType("resource")) {
        if (importProfileCount >= MAX_PROFILES_PER_KIND) {
          break;
        }
        if (!(entry instanceof PerformanceResourceTiming)) {
          continue;
        }
        const profile = buildImportProfile(entry, getPath());
        if (profile) {
          importProfileCount += 1;
          capture("web.performance.import", profile);
        }
      }
    });
    importObserver.observe({ buffered: false, type: "resource" });
    observers.push(importObserver);
  } catch {
    // Resource Timing is optional and profiling must never affect the app.
  }

  return () => {
    for (const observer of observers) {
      observer.disconnect();
    }
  };
}
