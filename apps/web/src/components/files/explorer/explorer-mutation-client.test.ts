import { afterEach, describe, expect, it, vi } from "vitest";
import {
  duplicateExplorerItemTransport,
  queueExplorerHardReingestTransport,
  restoreExplorerItemsFromTrash,
  runExplorerBulkMutation,
} from "@/components/files/explorer/explorer-mutation-client";

describe("Explorer mutation client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts bulk mutations and returns the parsed payload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [{ clientUploadId: "1", status: "ok" }],
          summary: { total: 1 },
        }),
        { status: 200 }
      )
    );

    const result = await runExplorerBulkMutation({
      payload: {
        items: [{ id: "item-1", kind: "file" }],
        operation: "delete",
      },
      workspaceUuid: "workspace-1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/workspaces/workspace-1/items/bulk",
      expect.objectContaining({
        body: JSON.stringify({
          items: [{ id: "item-1", kind: "file" }],
          operation: "delete",
        }),
        method: "POST",
      })
    );
    expect(result).toEqual({
      results: [{ clientUploadId: "1", status: "ok" }],
      summary: { total: 1 },
    });
  });

  it("parses trash restore errors from the API response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "restore failed" }), {
        status: 400,
      })
    );

    await expect(
      restoreExplorerItemsFromTrash({
        items: [{ id: "folder-1", kind: "folder" }],
        workspaceUuid: "workspace-2",
      })
    ).rejects.toThrow("restore failed");
  });

  it("uses duplicate and reingest transport endpoints with their expected success contracts", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "reingest blocked" }), {
          status: 500,
        })
      );

    await expect(
      duplicateExplorerItemTransport({
        item: { id: "file-9", kind: "file", parentId: "folder-2" },
        workspaceUuid: "workspace-3",
      })
    ).resolves.toBe(true);

    await expect(
      queueExplorerHardReingestTransport({
        fileId: "file-9",
        workspaceUuid: "workspace-3",
      })
    ).resolves.toEqual({
      error: "reingest blocked",
      ok: false,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/workspaces/workspace-3/items/duplicate",
      expect.objectContaining({
        body: JSON.stringify({
          id: "file-9",
          kind: "file",
          parentId: "folder-2",
        }),
        method: "POST",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/workspaces/workspace-3/files/file-9/reingest",
      expect.objectContaining({
        method: "POST",
      })
    );
  });
});
