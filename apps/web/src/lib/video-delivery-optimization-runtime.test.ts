import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  buildFailedVideoDeliveryMock,
  buildMuxVideoDeliveryMock,
  buildPendingVideoDeliveryMock,
  canOptimizeVideoDeliveryMock,
  createMuxAssetFromUrlMock,
  getMuxAssetMock,
  hasMuxVideoCredentialsMock,
  isAsyncVideoOptimizationEnabledMock,
  optimizeAndReuploadVideoMock,
  publishFilesInvalidationEventMock,
  updateFileAssetStorageMetadataMock,
} = vi.hoisted(() => ({
  buildFailedVideoDeliveryMock: vi.fn(),
  buildMuxVideoDeliveryMock: vi.fn(),
  buildPendingVideoDeliveryMock: vi.fn(),
  canOptimizeVideoDeliveryMock: vi.fn(),
  createMuxAssetFromUrlMock: vi.fn(),
  getMuxAssetMock: vi.fn(),
  hasMuxVideoCredentialsMock: vi.fn(),
  isAsyncVideoOptimizationEnabledMock: vi.fn(),
  optimizeAndReuploadVideoMock: vi.fn(),
  publishFilesInvalidationEventMock: vi.fn(),
  updateFileAssetStorageMetadataMock: vi.fn(),
}));

vi.mock("@/lib/file-data", () => ({
  updateFileAssetStorageMetadata: updateFileAssetStorageMetadataMock,
}));

vi.mock("@/lib/files-realtime-publisher", () => ({
  publishFilesInvalidationEvent: publishFilesInvalidationEventMock,
}));

vi.mock("@/lib/mux-video", () => ({
  createMuxAssetFromUrl: createMuxAssetFromUrlMock,
  getMuxAsset: getMuxAssetMock,
  hasMuxVideoCredentials: hasMuxVideoCredentialsMock,
}));

vi.mock("@/lib/video-delivery-core", () => ({
  buildFailedVideoDelivery: buildFailedVideoDeliveryMock,
  buildMuxVideoDelivery: buildMuxVideoDeliveryMock,
  buildPendingVideoDelivery: buildPendingVideoDeliveryMock,
  canOptimizeVideoDelivery: canOptimizeVideoDeliveryMock,
  isAsyncVideoOptimizationEnabled: isAsyncVideoOptimizationEnabledMock,
}));

vi.mock("@/lib/video-optimization-runtime", () => ({
  optimizeAndReuploadVideo: optimizeAndReuploadVideoMock,
}));

const videoDeliveryCoreSource = readFileSync(
  resolve(import.meta.dirname, "video-delivery-core.ts"),
  "utf8"
);
const videoDeliveryOptimizationRuntimeSource = readFileSync(
  resolve(import.meta.dirname, "video-delivery-optimization-runtime.ts"),
  "utf8"
);
const videoDeliverySyncSource = readFileSync(
  resolve(import.meta.dirname, "video-delivery-sync.ts"),
  "utf8"
);

import {
  runLegacyVideoOptimization,
  runMuxVideoDelivery,
  scheduleAsyncVideoDeliveryOptimization,
} from "@/lib/video-delivery-optimization-runtime";

describe("video delivery optimization runtime", () => {
  beforeEach(() => {
    buildFailedVideoDeliveryMock.mockReset();
    buildMuxVideoDeliveryMock.mockReset();
    buildPendingVideoDeliveryMock.mockReset();
    canOptimizeVideoDeliveryMock.mockReset();
    createMuxAssetFromUrlMock.mockReset();
    getMuxAssetMock.mockReset();
    hasMuxVideoCredentialsMock.mockReset();
    isAsyncVideoOptimizationEnabledMock.mockReset();
    optimizeAndReuploadVideoMock.mockReset();
    publishFilesInvalidationEventMock.mockReset();
    updateFileAssetStorageMetadataMock.mockReset();
  });

  it("fails closed when optimization is disabled or the file is not optimizable", () => {
    isAsyncVideoOptimizationEnabledMock.mockReturnValue(false);
    canOptimizeVideoDeliveryMock.mockReturnValue(true);

    expect(
      scheduleAsyncVideoDeliveryOptimization({
        file: { id: "file-1", mimeType: "video/mp4" },
        userId: "user-1",
        workspaceUuid: "workspace-1",
      } as never)
    ).toBe(false);
  });

  it("runs legacy optimization and publishes invalidation when optimized assets exist", async () => {
    optimizeAndReuploadVideoMock.mockResolvedValue({
      progressive: {
        mimeType: "video/mp4",
        name: "lecture.mp4",
        sizeBytes: 100,
        storageKey: "optimized-key",
        storageUrl: "https://cdn.example.com/lecture.mp4",
      },
      videoDelivery: { status: "ready" },
    });
    updateFileAssetStorageMetadataMock.mockResolvedValue({ id: "file-1" });

    await runLegacyVideoOptimization({
      file: {
        folderId: "folder-1",
        id: "file-1",
        mimeType: "video/mp4",
        name: "lecture.mov",
        sizeBytes: 100,
        storageKey: "orig-key",
        storageUrl: "https://cdn.example.com/original.mov",
      },
      pendingVideoDelivery: { status: "pending" } as never,
      userId: "user-1",
      workspaceUuid: "workspace-1",
    });

    expect(updateFileAssetStorageMetadataMock).toHaveBeenCalled();
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledTimes(2);
  });

  it("runs mux optimization and records final delivery state", async () => {
    createMuxAssetFromUrlMock.mockResolvedValue({ id: "mux-1" });
    buildMuxVideoDeliveryMock
      .mockReturnValueOnce({ status: "pending" })
      .mockReturnValueOnce({ status: "ready" });
    getMuxAssetMock.mockResolvedValueOnce({ id: "mux-1", status: "ready" });

    await runMuxVideoDelivery({
      file: {
        folderId: "folder-1",
        id: "file-1",
        mimeType: "video/mp4",
        name: "lecture.mp4",
        sizeBytes: 100,
        storageKey: "orig-key",
        storageUrl: "https://cdn.example.com/original.mp4",
        videoDelivery: null,
      },
      userId: "user-1",
      workspaceUuid: "workspace-1",
    });

    expect(createMuxAssetFromUrlMock).toHaveBeenCalled();
    expect(updateFileAssetStorageMetadataMock).toHaveBeenCalled();
  });

  it("falls back from mux to legacy in scheduled optimization", async () => {
    isAsyncVideoOptimizationEnabledMock.mockReturnValue(true);
    canOptimizeVideoDeliveryMock.mockReturnValue(true);
    hasMuxVideoCredentialsMock.mockReturnValue(true);
    buildPendingVideoDeliveryMock.mockReturnValue({ status: "pending" });
    createMuxAssetFromUrlMock.mockRejectedValue(new Error("mux down"));
    optimizeAndReuploadVideoMock.mockResolvedValue(null);
    buildFailedVideoDeliveryMock.mockReturnValue({ status: "failed" });

    expect(
      scheduleAsyncVideoDeliveryOptimization({
        file: {
          folderId: "folder-1",
          id: "file-1",
          mimeType: "video/mp4",
          name: "lecture.mp4",
          sizeBytes: 100,
          storageKey: "orig-key",
          storageUrl: "https://cdn.example.com/original.mp4",
          videoDelivery: null,
        },
        userId: "user-1",
        workspaceUuid: "workspace-1",
      } as never)
    ).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(optimizeAndReuploadVideoMock).toHaveBeenCalled();
    expect(updateFileAssetStorageMetadataMock).toHaveBeenCalled();
  });

  it("keeps video delivery split between pure core helpers, runtime optimization, and sync reconciliation", () => {
    expect(videoDeliveryCoreSource).toContain(
      "export function buildPendingVideoDelivery"
    );
    expect(videoDeliveryCoreSource).toContain(
      "export function buildMuxVideoDelivery"
    );
    expect(videoDeliveryCoreSource).toContain(
      "export function canOptimizeVideoDelivery"
    );
    expect(videoDeliveryCoreSource).not.toContain(
      "updateFileAssetStorageMetadata("
    );
    expect(videoDeliveryCoreSource).not.toContain(
      "publishFilesInvalidationEvent("
    );

    expect(videoDeliveryOptimizationRuntimeSource).toContain(
      "updateFileAssetStorageMetadata"
    );
    expect(videoDeliveryOptimizationRuntimeSource).toContain(
      "publishFilesInvalidationEvent"
    );
    expect(videoDeliveryOptimizationRuntimeSource).toContain(
      "createMuxAssetFromUrl"
    );
    expect(videoDeliveryOptimizationRuntimeSource).toContain(
      "optimizeAndReuploadVideo"
    );
    expect(videoDeliveryOptimizationRuntimeSource).toContain(
      "buildPendingVideoDelivery"
    );
    expect(videoDeliveryOptimizationRuntimeSource).toContain(
      "buildMuxVideoDelivery"
    );

    expect(videoDeliverySyncSource).toContain("getMuxAsset");
    expect(videoDeliverySyncSource).toContain("buildMuxVideoDelivery");
    expect(videoDeliverySyncSource).toContain("updateFileAssetStorageMetadata");
  });
});
