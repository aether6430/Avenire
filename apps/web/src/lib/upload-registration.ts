import type { scheduleIngestionJob } from "@avenire/ingestion/queue";
import type { registerFileAsset } from "@/lib/file-data";

export interface UploadRegistrationInput {
  contentHashSha256?: string | null;
  dedupeMode?: "allow" | "skip";
  folderId: string;
  hashComputedBy?: "client" | "server" | null;
  metadata?: Record<string, unknown>;
  mimeType?: string | null;
  name: string;
  sizeBytes: number;
  storageKey: string;
  storageUrl: string;
  userId: string;
  workspaceUuid: string;
}

export interface UploadRegistrationResult {
  file: Awaited<ReturnType<typeof registerFileAsset>>;
  ingestionJob: Awaited<ReturnType<typeof scheduleIngestionJob>> | null;
  status: "created" | "deduplicated";
}

export {
  assertTrustedUploadStorageUrl,
  extractMarkdownNotePayload,
  inferMimeTypeFromName,
  isMarkdownUpload,
  normalizeSha256,
  normalizeUploadThingStorageUrl,
  resolveMimeType,
} from "@/lib/upload-registration-model";
export {
  deleteUploadThingFile,
  registerWorkspaceMarkdownNote,
  registerWorkspaceUploadedFile,
} from "@/lib/upload-registration-runtime";
