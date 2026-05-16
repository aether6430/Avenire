import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadFilePreviewMarkdownNote,
  saveFilePreviewNoteMetadata,
  syncFilePreviewMarkdownNote,
} from "@/components/files/explorer/file-preview-note-client";

describe("File preview note client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and syncs markdown notes through the note sync endpoint", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            markdown: "# Hello",
            updatedAt: "2026-05-12T20:55:00.000Z",
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            merged: "# Hello world",
            updatedAt: "2026-05-12T20:56:00.000Z",
          }),
          { status: 200 }
        )
      );

    await expect(
      loadFilePreviewMarkdownNote({ fileId: "file-1" })
    ).resolves.toEqual({
      markdown: "# Hello",
      updatedAt: "2026-05-12T20:55:00.000Z",
    });

    await expect(
      syncFilePreviewMarkdownNote({
        base: "# Hello",
        current: "# Hello world",
        fileId: "file-1",
      })
    ).resolves.toEqual({
      merged: "# Hello world",
      updatedAt: "2026-05-12T20:56:00.000Z",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/notes/file-1/sync",
      expect.objectContaining({
        cache: "no-store",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/notes/file-1/sync",
      expect.objectContaining({
        body: JSON.stringify({
          base: "# Hello",
          current: "# Hello world",
        }),
        method: "POST",
      })
    );
  });

  it("routes metadata saves to the correct endpoint for markdown and non-markdown files", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    await expect(
      saveFilePreviewNoteMetadata({
        fileId: "file-2",
        isMarkdown: true,
        page: {
          bannerUrl: "https://cdn.example/cover.png",
          icon: null,
          properties: {},
        },
        workspaceUuid: "workspace-1",
      })
    ).resolves.toBe(true);

    await expect(
      saveFilePreviewNoteMetadata({
        fileId: "file-3",
        isMarkdown: false,
        page: { bannerUrl: null, icon: "A", properties: {} },
        workspaceUuid: "workspace-1",
      })
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/notes/file-2",
      expect.objectContaining({
        method: "PATCH",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/workspaces/workspace-1/files/file-3",
      expect.objectContaining({
        method: "PATCH",
      })
    );
  });
});
