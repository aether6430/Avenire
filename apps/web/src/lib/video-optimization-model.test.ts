import { describe, expect, it } from "vitest";
import {
  buildAssetStem,
  buildHlsVariants,
  buildMp4Name,
  isPrivateOrLocalAddress,
  rewritePlaylistReferences,
  scaleWidthToEven,
  shouldGenerateHls,
} from "@/lib/video-optimization-model";

describe("video optimization model", () => {
  it("detects private and local addresses", () => {
    expect(isPrivateOrLocalAddress("127.0.0.1")).toBe(true);
    expect(isPrivateOrLocalAddress("192.168.1.20")).toBe(true);
    expect(isPrivateOrLocalAddress("8.8.8.8")).toBe(false);
    expect(isPrivateOrLocalAddress("::1")).toBe(true);
  });

  it("builds stable asset names", () => {
    expect(buildMp4Name("Lecture.mov")).toBe("Lecture.mp4");
    expect(buildMp4Name("Lecture")).toBe("Lecture.mp4");

    const stem = buildAssetStem("Momentum Review.mov");
    expect(stem).toMatch(/^momentum-review-[a-f0-9]{8}$/);
  });

  it("scales widths evenly and chooses hls variants", () => {
    expect(scaleWidthToEven(1920, 1080, 720)).toBe(1280);

    expect(
      buildHlsVariants({
        bitrateKbps: 5400,
        durationSeconds: 240,
        height: 1080,
        width: 1920,
      }).map((variant) => variant.label)
    ).toEqual(["720p", "1080p"]);

    expect(
      buildHlsVariants({
        bitrateKbps: 1200,
        durationSeconds: 60,
        height: 480,
        width: 854,
      })[0]
    ).toMatchObject({
      label: "source",
    });
  });

  it("decides when hls should be generated", () => {
    expect(
      shouldGenerateHls({
        analysis: {
          bitrateKbps: 1200,
          durationSeconds: 60,
          height: 480,
          width: 854,
        },
        hlsSizeThresholdBytes: 80 * 1024 * 1024,
        requiresTranscode: false,
        sourceSizeBytes: 10 * 1024 * 1024,
      })
    ).toBe(false);

    expect(
      shouldGenerateHls({
        analysis: {
          bitrateKbps: 1200,
          durationSeconds: 400,
          height: 480,
          width: 854,
        },
        hlsSizeThresholdBytes: 80 * 1024 * 1024,
        requiresTranscode: false,
        sourceSizeBytes: 10 * 1024 * 1024,
      })
    ).toBe(true);
  });

  it("rewrites playlist references for media urls", () => {
    const rewritten = rewritePlaylistReferences(
      '#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\nsegment-000.m4s\n',
      new Map([
        ["init.mp4", "https://cdn.example.com/init.mp4"],
        ["segment-000.m4s", "https://cdn.example.com/segment-000.m4s"],
      ])
    );

    expect(rewritten).toContain('URI="https://cdn.example.com/init.mp4"');
    expect(rewritten).toContain("https://cdn.example.com/segment-000.m4s");
  });
});
