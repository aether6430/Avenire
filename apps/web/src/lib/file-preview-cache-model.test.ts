import { describe, expect, it } from "vitest";
import {
  buildWarmFetchInit,
  getEntryKey,
  parseMapUri,
  parsePlaylistUris,
  parseWarmMediaUrls,
  shouldCachePreviewBlob,
} from "@/lib/file-preview-cache-model";

describe("file preview cache model", () => {
  it("builds stable cache keys for progressive and hls sources", () => {
    expect(getEntryKey("https://cdn.example.com/video.mp4")).toBe(
      "progressive:https://cdn.example.com/video.mp4"
    );
    expect(
      getEntryKey({
        kind: "progressive",
        url: "https://cdn.example.com/video.mp4",
      } as never)
    ).toBe("progressive:https://cdn.example.com/video.mp4");
    expect(
      getEntryKey({
        fallbackUrl: "https://cdn.example.com/video.mp4",
        kind: "hls",
        manifestUrl: "https://cdn.example.com/master.m3u8",
      } as never)
    ).toBe("hls:https://cdn.example.com/master.m3u8");
  });

  it("only caches preview blobs for bounded video payloads", () => {
    expect(shouldCachePreviewBlob("video", 10)).toBe(true);
    expect(shouldCachePreviewBlob("audio", 10)).toBe(false);
    expect(shouldCachePreviewBlob("video", 100 * 1024 * 1024)).toBe(false);
  });

  it("builds warm fetch init with optional abort signal", () => {
    const controller = new AbortController();
    expect(buildWarmFetchInit(controller.signal)).toMatchObject({
      cache: "force-cache",
      credentials: "same-origin",
      signal: controller.signal,
    });
  });

  it("parses media and map urls from hls playlists", () => {
    const playlist = `#EXTM3U
#EXT-X-MAP:URI="init.mp4"
#EXTINF:2.0,
segment-000.m4s
#EXTINF:2.0,
segment-001.m4s
`;

    expect(
      parsePlaylistUris(playlist, "https://cdn.example.com/master.m3u8")
    ).toEqual([
      "https://cdn.example.com/segment-000.m4s",
      "https://cdn.example.com/segment-001.m4s",
    ]);
    expect(parseMapUri(playlist, "https://cdn.example.com/master.m3u8")).toBe(
      "https://cdn.example.com/init.mp4"
    );
    expect(
      parseWarmMediaUrls(playlist, "https://cdn.example.com/master.m3u8")
    ).toEqual([
      "https://cdn.example.com/init.mp4",
      "https://cdn.example.com/segment-000.m4s",
      "https://cdn.example.com/segment-001.m4s",
    ]);
  });
});
