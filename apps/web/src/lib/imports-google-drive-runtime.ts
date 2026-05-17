import "server-only";

import { createHash } from "node:crypto";
import { UTApi, UTFile } from "@avenire/storage";
import { z } from "zod";
import {
  getProviderAccessToken,
  requireDataImportDestination,
  serializeDestination,
} from "@/lib/imports-provider-runtime";
import {
  deleteUploadThingFile,
  registerWorkspaceUploadedFile,
} from "@/lib/upload-registration";

const googleDriveImportSchema = z.object({
  fileIds: z.array(z.string().min(1)).min(1).max(50),
});

interface ImportFileSummary {
  fileId: string;
  ingestionJobId: string | null;
  name: string;
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

function sha256Hex(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
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
