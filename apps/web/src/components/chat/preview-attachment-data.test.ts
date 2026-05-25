import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchPreviewAttachmentPlaybackDescriptor,
  loadPreviewAttachmentText,
} from "@/components/chat/preview-attachment-data";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("preview attachment client", () => {
  it("builds a progressive video descriptor outside workspace playback", async () => {
    const descriptor = await fetchPreviewAttachmentPlaybackDescriptor({
      contentType: "video/mp4",
      url: "https://cdn.test/video.mp4",
    });

    expect(descriptor?.status).toBe("ready");
    expect(descriptor?.posterUrl).toBeNull();
    expect(descriptor?.preferredSource).toBeTruthy();
    expect(descriptor?.fallbackSource).toBeTruthy();
  });

  it("loads text from a File before hitting network transport", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const text = await loadPreviewAttachmentText({
      file: new File(["hello world"], "note.txt", {
        type: "text/plain",
      }),
      previewUrl: "https://cdn.test/note.txt",
    });

    expect(text).toBe("hello world");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("loads workspace text preview from the workspace stream route", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("workspace body", {
        status: 200,
      })
    );

    const text = await loadPreviewAttachmentText({
      previewUrl: "/ignored",
      source: "workspace",
      workspaceFileId: "file-123",
      workspaceUuid: "workspace-456",
    });

    expect(text).toBe("workspace body");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/workspaces/workspace-456/files/file-123/stream",
      {
        headers: {
          Accept: "text/plain,text/markdown,text/*,*/*",
        },
      }
    );
  });
});
