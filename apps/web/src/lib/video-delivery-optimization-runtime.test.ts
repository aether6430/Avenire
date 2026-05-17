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

vi.mock("@/lib/video-optimization", () => ({
  optimizeAndReuploadVideo: optimizeAndReuploadVideoMock,
}));

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
});
