import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { lookupMock, isTrustedStorageUrlMock } = vi.hoisted(() => ({
  lookupMock: vi.fn(),
  isTrustedStorageUrlMock: vi.fn(),
}));

vi.mock("node:dns/promises", () => ({
  lookup: lookupMock,
}));

vi.mock("@/lib/file-data", () => ({
  isTrustedStorageUrl: isTrustedStorageUrlMock,
}));

const videoOptimizationModelSource = readFileSync(
  resolve(import.meta.dirname, "video-optimization-model.ts"),
  "utf8"
);
const videoOptimizationRuntimeSource = readFileSync(
  resolve(import.meta.dirname, "video-optimization-runtime.ts"),
  "utf8"
);

import {
  optimizeAndReuploadVideo,
  validateSourceUrl,
} from "@/lib/video-optimization-runtime";

describe("video optimization runtime", () => {
  beforeEach(() => {
    lookupMock.mockReset();
    isTrustedStorageUrlMock.mockReset();
  });

  it("rejects localhost and private-address urls", async () => {
    await expect(
      validateSourceUrl("http://localhost/video.mp4")
    ).rejects.toThrow("Localhost");
    await expect(
      validateSourceUrl("http://127.0.0.1/video.mp4")
    ).rejects.toThrow("private address");
  });

  it("allows trusted storage urls and public dns results", async () => {
    isTrustedStorageUrlMock.mockReturnValueOnce(true);
    await expect(
      validateSourceUrl("https://trusted-storage.example/video.mp4")
    ).resolves.toBe("https://trusted-storage.example/video.mp4");

    isTrustedStorageUrlMock.mockReturnValue(false);
    lookupMock.mockResolvedValue([{ address: "8.8.8.8" }]);
    await expect(
      validateSourceUrl("https://cdn.example.com/video.mp4")
    ).resolves.toBe("https://cdn.example.com/video.mp4");
  });

  it("fails closed for missing upload token or unreadable source fetch", async () => {
    const previousToken = process.env.UPLOADTHING_TOKEN;
    process.env.UPLOADTHING_TOKEN = undefined;

    await expect(
      optimizeAndReuploadVideo({
        sourceName: "Lecture.mp4",
        sourceUrl: "https://cdn.example.com/video.mp4",
      })
    ).resolves.toBeNull();

    process.env.UPLOADTHING_TOKEN = "token";
    isTrustedStorageUrlMock.mockReturnValue(false);
    lookupMock.mockResolvedValue([{ address: "8.8.8.8" }]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        body: null,
        ok: false,
      })
    );

    await expect(
      optimizeAndReuploadVideo({
        sourceName: "Lecture.mp4",
        sourceUrl: "https://cdn.example.com/video.mp4",
      })
    ).resolves.toBeNull();

    process.env.UPLOADTHING_TOKEN = previousToken;
  });

  it("keeps video optimization split between pure planning model helpers and side-effect runtime execution", () => {
    expect(videoOptimizationModelSource).toContain(
      "export function buildHlsVariants"
    );
    expect(videoOptimizationModelSource).toContain(
      "export function isPrivateOrLocalAddress"
    );
    expect(videoOptimizationModelSource).toContain(
      "export function rewritePlaylistReferences"
    );
    expect(videoOptimizationModelSource).not.toContain("lookup(");
    expect(videoOptimizationModelSource).not.toContain("uploadStorageFile(");

    expect(videoOptimizationRuntimeSource).toContain("lookup");
    expect(videoOptimizationRuntimeSource).toContain("uploadStorageFile");
    expect(videoOptimizationRuntimeSource).toContain("spawn");
    expect(videoOptimizationRuntimeSource).toContain("buildHlsVariants");
    expect(videoOptimizationRuntimeSource).toContain("shouldGenerateHls");
  });
});
