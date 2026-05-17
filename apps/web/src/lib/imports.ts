import "server-only";
import { createHash } from "node:crypto";
import { UTApi, UTFile } from "@avenire/storage";
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
import {
  deleteUploadThingFile,
  registerWorkspaceUploadedFile,
} from "@/lib/upload-registration";

const notionImportSchema = z.object({
  pageIds: z.array(z.string().min(1)).min(1).max(50),
});

const googleDriveImportSchema = z.object({
  fileIds: z.array(z.string().min(1)).min(1).max(50),
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

interface DriveFileDescriptor {
  downloadMimeType: string | null;
  fileId: string;
  metadata: Record<string, unknown>;
  name: string;
  sourceMimeType: string | null;
  url: string;
}

interface DriveFileMetadata {
  id: string;
  mimeType?: string;
  modifiedTime?: string;
  name?: string;
  webViewLink?: string;
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

function sha256Hex(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
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

function appendExtension(name: string, extension: string) {
  const trimmed = name.trim() || "Untitled";
  const normalizedExtension = extension.startsWith(".")
    ? extension
    : `.${extension}`;
  if (trimmed.toLowerCase().endsWith(normalizedExtension.toLowerCase())) {
    return trimmed;
  }
  return `${trimmed}${normalizedExtension}`;
}

function requireEnv(name: keyof NodeJS.ProcessEnv) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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

function getGoogleExportDescriptor(
  file: DriveFileMetadata
): DriveFileDescriptor {
  const sourceMimeType = file.mimeType?.trim() ?? null;
  const baseName = file.name?.trim() || "Untitled";
  const metadata = {
    googleDrive: {
      fileId: file.id,
      sourceMimeType,
      webViewLink: file.webViewLink ?? null,
    },
    importSource: "google-drive",
  };

  if (sourceMimeType === "application/vnd.google-apps.document") {
    return {
      downloadMimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileId: file.id,
      metadata,
      name: appendExtension(baseName, ".docx"),
      sourceMimeType,
      url: `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )}`,
    };
  }

  if (sourceMimeType?.startsWith("application/vnd.google-apps.")) {
    return {
      downloadMimeType: "application/pdf",
      fileId: file.id,
      metadata,
      name: appendExtension(baseName, ".pdf"),
      sourceMimeType,
      url: `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(
        "application/pdf"
      )}`,
    };
  }

  return {
    downloadMimeType: sourceMimeType,
    fileId: file.id,
    metadata,
    name: baseName,
    sourceMimeType,
    url: `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
  };
}

async function fetchGoogleDriveFile(accessToken: string, fileId: string) {
  const metadataResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,modifiedTime,webViewLink`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!metadataResponse.ok) {
    throw new Error(`Unable to load Drive file metadata for ${fileId}.`);
  }

  const metadata = (await metadataResponse.json()) as DriveFileMetadata;
  const descriptor = getGoogleExportDescriptor(metadata);

  const contentResponse = await fetch(descriptor.url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!contentResponse.ok) {
    throw new Error(`Unable to download Drive file ${descriptor.name}.`);
  }

  const bytes = new Uint8Array(await contentResponse.arrayBuffer());

  return {
    bytes,
    descriptor,
  };
}

async function uploadImportedBuffer(input: {
  bytes: Uint8Array;
  folderId: string;
  metadata: Record<string, unknown>;
  mimeType: string | null;
  name: string;
  userId: string;
  workspaceId: string;
}) {
  const uploadThingToken = requireEnv("UPLOADTHING_TOKEN");
  const utapi = new UTApi({ token: uploadThingToken });
  const fileBuffer = input.bytes.buffer.slice(
    input.bytes.byteOffset,
    input.bytes.byteOffset + input.bytes.byteLength
  ) as ArrayBuffer;
  const uploadResult = await utapi.uploadFiles(
    new UTFile([fileBuffer], input.name, {
      type: input.mimeType ?? undefined,
    })
  );
  const uploaded = Array.isArray(uploadResult)
    ? uploadResult[0]?.data
    : uploadResult?.data;

  if (!(uploaded?.key && uploaded.ufsUrl)) {
    throw new Error(`Unable to upload imported file ${input.name}.`);
  }

  try {
    return await registerWorkspaceUploadedFile({
      contentHashSha256: sha256Hex(input.bytes),
      folderId: input.folderId,
      hashComputedBy: "server",
      metadata: input.metadata,
      mimeType: input.mimeType,
      name: input.name,
      sizeBytes: input.bytes.byteLength,
      storageKey: uploaded.key,
      storageUrl: uploaded.ufsUrl,
      userId: input.userId,
      workspaceUuid: input.workspaceId,
    });
  } catch (error) {
    await deleteUploadThingFile(uploaded.key);
    throw error;
  }
}

export function parseGoogleDriveImportPayload(payload: unknown) {
  return googleDriveImportSchema.parse(payload);
}

export async function getGooglePickerToken(userId: string) {
  const { accessToken } = await getProviderAccessToken(userId, "google");
  return { accessToken };
}

export async function importGoogleDriveFiles(input: {
  fileIds: string[];
  userId: string;
}) {
  const destination = await requireDataImportDestination(input.userId);
  const { accessToken } = await getProviderAccessToken(input.userId, "google");
  const imported: ImportFileSummary[] = [];

  for (const fileId of input.fileIds) {
    const { bytes, descriptor } = await fetchGoogleDriveFile(
      accessToken,
      fileId
    );
    const result = await uploadImportedBuffer({
      bytes,
      folderId: destination.folderId,
      metadata: descriptor.metadata,
      mimeType: descriptor.downloadMimeType,
      name: descriptor.name,
      userId: input.userId,
      workspaceId: destination.workspaceId,
    });

    imported.push({
      fileId: result.file.id,
      ingestionJobId: result.ingestionJob?.id ?? null,
      name: result.file.name,
    });
  }

  return {
    destination: serializeDestination(destination),
    imported,
  };
}

export { DATA_IMPORT_PRESET_LABEL } from "@/lib/imports-data-import-preset";
export {
  GOOGLE_DRIVE_READONLY_SCOPE,
  GOOGLE_IMPORT_SCOPES,
} from "@/lib/imports-google-scopes";
export {
  getDataImportOverview,
  getImportProviderDebugSnapshot,
  listImportDestinationFolders,
  saveDataImportDestination,
} from "@/lib/imports-provider-runtime";
