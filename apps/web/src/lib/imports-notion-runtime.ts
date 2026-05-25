import "server-only";

import { Client as NotionClient } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { NotionToMarkdown } from "notion-to-md";
import { z } from "zod";
import { createWorkspaceNoteFile } from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import {
  getProviderAccessToken,
  requireDataImportDestination,
  serializeDestination,
} from "@/lib/imports-provider-runtime";

const notionImportSchema = z.object({
  pageIds: z.array(z.string().min(1)).min(1).max(50),
});

interface ImportFileSummary {
  fileId: string;
  ingestionJobId: string | null;
  name: string;
}

interface NotionSearchPage {
  id: string;
  lastEditedTime: string;
  title: string;
  url: string | null;
}

function isFullNotionPage(
  value: PageObjectResponse | { object: string }
): value is PageObjectResponse {
  return (
    value.object === "page" &&
    "last_edited_time" in value &&
    "url" in value &&
    "properties" in value
  );
}

function toMarkdownFileName(title: string) {
  const trimmed = title.trim() || "Untitled";
  const sanitized = trimmed.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ");
  return `${sanitized.trim().slice(0, 240) || "Untitled"}.md`;
}

function normalizeMarkdownDocument(title: string, markdown: string) {
  const trimmedTitle = title.trim() || "Untitled";
  const trimmedMarkdown = markdown.trim();
  if (!trimmedMarkdown) {
    return `# ${trimmedTitle}\n`;
  }

  if (/^#\s+.+/m.test(trimmedMarkdown)) {
    return `${trimmedMarkdown.replace(/\s+$/, "")}\n`;
  }

  return `# ${trimmedTitle}\n\n${trimmedMarkdown.replace(/\s+$/, "")}\n`;
}

function getNotionPageTitle(page: PageObjectResponse) {
  for (const value of Object.values(page.properties)) {
    if (value.type !== "title") {
      continue;
    }

    const text = value.title
      .map((entry) => entry.plain_text)
      .join("")
      .trim();
    if (text) {
      return text;
    }
  }

  return "Untitled";
}

async function listNotionChildPages(
  notionClient: NotionClient,
  parentPageId: string
) {
  const childPageIds = new Set<string>();
  let cursor: string | undefined;

  do {
    const response = await notionClient.blocks.children.list({
      block_id: parentPageId,
      page_size: 100,
      start_cursor: cursor,
    });

    for (const block of response.results) {
      if ("type" in block && block.type === "child_page") {
        childPageIds.add(block.id);
      }
    }

    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);

  return Array.from(childPageIds);
}

async function createImportedNote(input: {
  markdown: string;
  metadata: Record<string, unknown>;
  title: string;
  userId: string;
  workspaceId: string;
  folderId: string;
}) {
  const file = await createWorkspaceNoteFile({
    content: input.markdown,
    folderId: input.folderId,
    metadata: input.metadata,
    name: toMarkdownFileName(input.title),
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  await publishFilesInvalidationEvent({
    folderId: input.folderId,
    reason: "file.created",
    workspaceUuid: input.workspaceId,
  });
  await publishFilesInvalidationEvent({
    reason: "tree.changed",
    workspaceUuid: input.workspaceId,
  });

  return file;
}

export async function listImportableNotionPages(userId: string) {
  const { accessToken } = await getProviderAccessToken(userId, "notion");
  const notionClient = new NotionClient({ auth: accessToken });
  const pages: NotionSearchPage[] = [];
  let cursor: string | undefined;

  do {
    const response = await notionClient.search({
      filter: {
        property: "object",
        value: "page",
      },
      page_size: 100,
      sort: {
        direction: "descending",
        timestamp: "last_edited_time",
      },
      start_cursor: cursor,
    });

    for (const result of response.results) {
      if (!isFullNotionPage(result)) {
        continue;
      }

      pages.push({
        id: result.id,
        lastEditedTime: result.last_edited_time,
        title: getNotionPageTitle(result),
        url: result.url ?? null,
      });
    }

    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor && pages.length < 200);

  return pages;
}

export function parseNotionImportPayload(payload: unknown) {
  return notionImportSchema.parse(payload);
}

export async function importNotionPages(input: {
  pageIds: string[];
  userId: string;
}) {
  const destination = await requireDataImportDestination(input.userId);
  const { accessToken } = await getProviderAccessToken(input.userId, "notion");
  const notionClient = new NotionClient({ auth: accessToken });
  const notionToMarkdown = new NotionToMarkdown({
    notionClient,
    config: {
      parseChildPages: false,
      separateChildPage: false,
    },
  });
  const seenPageIds = new Set<string>();
  const imported: ImportFileSummary[] = [];

  const importPage = async (pageId: string, depth: number) => {
    if (seenPageIds.has(pageId)) {
      return;
    }
    seenPageIds.add(pageId);

    const page = (await notionClient.pages.retrieve({
      page_id: pageId,
    })) as PageObjectResponse;
    const title = getNotionPageTitle(page);
    const mdBlocks = await notionToMarkdown.pageToMarkdown(pageId);
    const mdOutput = notionToMarkdown.toMarkdownString(mdBlocks);
    const markdown = normalizeMarkdownDocument(title, mdOutput.parent ?? "");
    const file = await createImportedNote({
      folderId: destination.folderId,
      markdown,
      metadata: {
        importSource: "notion",
        notion: {
          pageId,
          url: page.url ?? null,
        },
        type: "note",
      },
      title,
      userId: input.userId,
      workspaceId: destination.workspaceId,
    });

    imported.push({
      fileId: file.id,
      ingestionJobId: null,
      name: file.name,
    });

    if (depth >= 1) {
      return;
    }

    const childPageIds = await listNotionChildPages(notionClient, pageId);
    for (const childPageId of childPageIds) {
      await importPage(childPageId, depth + 1);
    }
  };

  for (const pageId of input.pageIds) {
    await importPage(pageId, 0);
  }

  return {
    destination: serializeDestination(destination),
    imported,
  };
}
