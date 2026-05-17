import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  createWorkspaceNoteFileMock,
  getProviderAccessTokenMock,
  pageToMarkdownMock,
  pagesRetrieveMock,
  publishFilesInvalidationEventMock,
  requireDataImportDestinationMock,
  searchMock,
  toMarkdownStringMock,
} = vi.hoisted(() => ({
  createWorkspaceNoteFileMock: vi.fn(),
  getProviderAccessTokenMock: vi.fn(),
  pageToMarkdownMock: vi.fn(),
  pagesRetrieveMock: vi.fn(),
  publishFilesInvalidationEventMock: vi.fn(),
  requireDataImportDestinationMock: vi.fn(),
  searchMock: vi.fn(),
  toMarkdownStringMock: vi.fn(),
}));

vi.mock("@notionhq/client", () => ({
  Client: vi.fn(function NotionClientMock() {
    return {
      blocks: {
        children: {
          list: vi.fn().mockResolvedValue({
            has_more: false,
            results: [],
          }),
        },
      },
      pages: {
        retrieve: pagesRetrieveMock,
      },
      search: searchMock,
    };
  }),
}));

vi.mock("notion-to-md", () => ({
  NotionToMarkdown: vi.fn(function NotionToMarkdownMock() {
    return {
      pageToMarkdown: pageToMarkdownMock,
      toMarkdownString: toMarkdownStringMock,
    };
  }),
}));

vi.mock("@/lib/file-data", () => ({
  createWorkspaceNoteFile: createWorkspaceNoteFileMock,
}));

vi.mock("@/lib/files-realtime-publisher", () => ({
  publishFilesInvalidationEvent: publishFilesInvalidationEventMock,
}));

vi.mock("@/lib/imports-provider-runtime", () => ({
  getProviderAccessToken: getProviderAccessTokenMock,
  requireDataImportDestination: requireDataImportDestinationMock,
  serializeDestination: (
    value: {
      createdAt?: Date;
      updatedAt?: Date;
    } | null
  ) =>
    value
      ? {
          ...value,
          createdAt: value.createdAt?.toISOString?.() ?? null,
          updatedAt: value.updatedAt?.toISOString?.() ?? null,
        }
      : null,
}));

import {
  importNotionPages,
  listImportableNotionPages,
  parseNotionImportPayload,
} from "@/lib/imports-notion-runtime";

describe("imports notion runtime", () => {
  beforeEach(() => {
    createWorkspaceNoteFileMock.mockReset();
    getProviderAccessTokenMock.mockReset();
    pageToMarkdownMock.mockReset();
    pagesRetrieveMock.mockReset();
    publishFilesInvalidationEventMock.mockReset();
    requireDataImportDestinationMock.mockReset();
    searchMock.mockReset();
    toMarkdownStringMock.mockReset();
  });

  it("parses notion import payloads", () => {
    expect(parseNotionImportPayload({ pageIds: ["page-1"] })).toEqual({
      pageIds: ["page-1"],
    });
  });

  it("lists importable notion pages", async () => {
    getProviderAccessTokenMock.mockResolvedValue({ accessToken: "token" });
    searchMock.mockResolvedValue({
      has_more: false,
      results: [
        {
          id: "page-1",
          last_edited_time: "2026-05-17T00:00:00.000Z",
          object: "page",
          properties: {
            title: {
              title: [{ plain_text: "Momentum Review" }],
              type: "title",
            },
          },
          url: "https://notion.so/page-1",
        },
      ],
    });

    const pages = await listImportableNotionPages("user-1");
    expect(pages[0]?.title).toBe("Momentum Review");
  });

  it("imports notion pages into the destination workspace", async () => {
    getProviderAccessTokenMock.mockResolvedValue({ accessToken: "token" });
    requireDataImportDestinationMock.mockResolvedValue({
      createdAt: new Date("2026-05-17T00:00:00.000Z"),
      folderId: "folder-1",
      updatedAt: new Date("2026-05-17T00:00:00.000Z"),
      workspaceId: "workspace-1",
    });
    pagesRetrieveMock.mockResolvedValue({
      id: "page-1",
      object: "page",
      properties: {
        title: {
          title: [{ plain_text: "Momentum Review" }],
          type: "title",
        },
      },
      url: "https://notion.so/page-1",
    });
    pageToMarkdownMock.mockResolvedValue([]);
    toMarkdownStringMock.mockReturnValue({ parent: "Momentum is conserved." });
    createWorkspaceNoteFileMock.mockResolvedValue({
      id: "file-1",
      name: "Momentum Review.md",
    });

    const result = await importNotionPages({
      pageIds: ["page-1"],
      userId: "user-1",
    });

    expect(createWorkspaceNoteFileMock).toHaveBeenCalled();
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledTimes(2);
    expect(result.imported[0]?.fileId).toBe("file-1");
  });
});
