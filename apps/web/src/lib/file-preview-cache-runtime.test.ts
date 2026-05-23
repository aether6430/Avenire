import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getPlaybackSourcePrimaryUrlMock } = vi.hoisted(() => ({
  getPlaybackSourcePrimaryUrlMock: vi.fn(
    (source: { kind: string; url?: string; manifestUrl?: string }) =>
      source.kind === "hls" ? (source.manifestUrl ?? "") : (source.url ?? "")
  ),
}));

vi.mock("@/lib/media-playback", () => ({
  getPlaybackSourceCacheKey: vi.fn(
    (source: { kind: string; url?: string; manifestUrl?: string }) =>
      source.kind === "hls"
        ? `hls:${source.manifestUrl}`
        : `progressive:${source.url}`
  ),
  getPlaybackSourcePrimaryUrl: getPlaybackSourcePrimaryUrlMock,
}));

const filePreviewCacheBarrelSource = readFileSync(
  resolve(import.meta.dirname, "./file-preview-cache.ts"),
  "utf8"
);
const filePreviewCacheModelSource = readFileSync(
  resolve(import.meta.dirname, "./file-preview-cache-model.ts"),
  "utf8"
);
const filePreviewCacheRuntimeSource = readFileSync(
  resolve(import.meta.dirname, "./file-preview-cache-runtime.ts"),
  "utf8"
);

import {
  getCachedPreviewUrl,
  getPlaybackCacheKey,
  getWarmState,
  isFileOpenedCached,
  markFileOpened,
  primeMediaPlayback,
  releaseMediaPlaybackPrime,
  resolveCachedPlaybackSource,
} from "@/lib/file-preview-cache-runtime";

describe("file preview cache runtime", () => {
  beforeEach(() => {
    getPlaybackSourcePrimaryUrlMock.mockClear();
    vi.restoreAllMocks();
    vi.stubGlobal("window", {
      location: { origin: "https://app.example.com" },
    });
    vi.stubGlobal("document", {
      createElement: vi.fn((tagName: string) => {
        if (tagName === "link") {
          return {
            href: "",
            rel: "",
          };
        }

        return {
          addEventListener: vi.fn((event: string, handler: () => void) => {
            if (event === "loadeddata") {
              handler();
            }
          }),
          load: vi.fn(),
          muted: false,
          playsInline: false,
          preload: "",
          remove: vi.fn(),
          removeEventListener: vi.fn(),
          src: "",
        };
      }),
      head: {
        appendChild: vi.fn(),
      },
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue(
      "blob:https://app.example.com/video"
    );
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  it("tracks opened files and warm state transitions", async () => {
    markFileOpened("file-1");
    expect(isFileOpenedCached("file-1")).toBe(true);

    const playbackSource = {
      kind: "progressive",
      url: "https://cdn.example.com/video.mp4",
    } as const;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        blob: async () => new Blob(["video"]),
        ok: true,
      })
    );

    await primeMediaPlayback(playbackSource, {
      mediaType: "video",
      sizeBytes: 1024,
    });

    expect(getWarmState(playbackSource)).toBe("warm");
    expect(getCachedPreviewUrl(playbackSource)).not.toBeNull();

    releaseMediaPlaybackPrime(playbackSource);
    expect(getWarmState(playbackSource)).toBe("warm");
  });

  it("warms hls playback using manifest-derived urls", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "#EXTM3U\nvariant.m3u8\n",
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\nsegment-000.m4s\n',
      })
      .mockResolvedValue({
        ok: true,
      });
    vi.stubGlobal("fetch", fetchMock);

    await primeMediaPlayback(
      {
        fallbackUrl: "https://cdn.example.com/video.mp4",
        kind: "hls",
        manifestUrl: "https://cdn.example.com/master.m3u8",
      } as never,
      { posterUrl: "https://cdn.example.com/poster.jpg" }
    );

    expect(fetchMock).toHaveBeenCalled();
    expect(
      getWarmState({
        fallbackUrl: "https://cdn.example.com/video.mp4",
        kind: "hls",
        manifestUrl: "https://cdn.example.com/master.m3u8",
      } as never)
    ).toBe("warm");
  });

  it("retries a cold hls entry instead of leaving the failed warm attempt stuck until ttl expiry", async () => {
    const playbackSource = {
      fallbackUrl: "https://cdn.example.com/video-retry.mp4",
      kind: "hls",
      manifestUrl: "https://cdn.example.com/master-retry.m3u8",
    } as const;
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("manifest offline"))
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "#EXTM3U\nvariant.m3u8\n",
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\nsegment-000.m4s\n',
      })
      .mockResolvedValue({
        ok: true,
      });
    vi.stubGlobal("fetch", fetchMock);

    await primeMediaPlayback(playbackSource, {
      posterUrl: "https://cdn.example.com/poster.jpg",
    });
    expect(getWarmState(playbackSource)).toBe("cold");

    releaseMediaPlaybackPrime(playbackSource);

    await primeMediaPlayback(playbackSource, {
      posterUrl: "https://cdn.example.com/poster.jpg",
    });
    expect(getWarmState(playbackSource)).toBe("warm");
    expect(fetchMock).toHaveBeenCalledTimes(7);
  });

  it("resolves cached playback sources and exposes stable cache keys", () => {
    const source = {
      kind: "progressive",
      url: "https://cdn.example.com/video.mp4",
    } as const;

    expect(getPlaybackCacheKey(source)).toBe(
      "progressive:https://cdn.example.com/video.mp4"
    );
    expect(resolveCachedPlaybackSource(source)).toMatchObject({
      kind: "progressive",
    });
  });

  it("keeps file preview caching split between a thin barrel, pure cache helpers, and browser/runtime warming logic", () => {
    expect(filePreviewCacheBarrelSource).toContain(
      "@/lib/file-preview-cache-model"
    );
    expect(filePreviewCacheBarrelSource).toContain(
      "@/lib/file-preview-cache-runtime"
    );
    expect(filePreviewCacheBarrelSource).not.toContain(
      "document.createElement"
    );
    expect(filePreviewCacheBarrelSource).not.toContain("fetch(");

    expect(filePreviewCacheModelSource).toContain(
      "export function buildWarmFetchInit"
    );
    expect(filePreviewCacheModelSource).toContain(
      "export function parseWarmMediaUrls"
    );
    expect(filePreviewCacheModelSource).toContain(
      "export function shouldCachePreviewBlob"
    );
    expect(filePreviewCacheModelSource).not.toContain("document.createElement");
    expect(filePreviewCacheModelSource).not.toContain("fetch(");

    expect(filePreviewCacheRuntimeSource).toContain("document.createElement");
    expect(filePreviewCacheRuntimeSource).toContain("fetch(");
    expect(filePreviewCacheRuntimeSource).toContain("buildWarmFetchInit");
    expect(filePreviewCacheRuntimeSource).toContain("parseWarmMediaUrls");
    expect(filePreviewCacheRuntimeSource).toContain("shouldCachePreviewBlob");
  });
});
