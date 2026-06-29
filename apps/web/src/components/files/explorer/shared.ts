import type { VideoDeliveryRecord } from "@/lib/file-data";
import type { FrontmatterProperties } from "@/lib/frontmatter";
import type { ShareSuggestion } from "@/types/share";

export type UploadStatus = "failed" | "queued" | "uploaded" | "uploading";

export interface FolderRecord {
  bannerUrl?: string | null;
  createdAt?: string;
  createdBy?: string;
  iconColor?: string | null;
  id: string;
  isShared?: boolean;
  name: string;
  parentId: string | null;
  readOnly?: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
}

export interface FileRecord {
  createdAt: string;
  folderId: string;
  id: string;
  isIngested?: boolean;
  isNote?: boolean;
  isShared?: boolean;
  metadata?: Record<string, unknown>;
  mimeType: string | null;
  name: string;
  noteContent?: string | null;
  page?: {
    bannerUrl: string | null;
    icon: string | null;
    properties: FrontmatterProperties;
  } | null;
  readOnly?: boolean;
  sizeBytes: number;
  sourceWorkspaceId?: string;
  storageUrl: string;
  updatedAt?: string;
  updatedBy?: string | null;
  uploadedBy?: string;
  videoDelivery?: VideoDeliveryRecord | null;
}

export interface WorkspaceMemberRecord {
  email: string | null;
  id: string | null;
  name: string | null;
  role: string;
  userId: string | null;
}

export type { ShareSuggestion };

export interface UploadQueueItem {
  error?: string;
  id: string;
  name: string;
  sizeLabel: string;
  status: UploadStatus;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function toUpdatedLabel(isoDate: string): string {
  if (!isoDate) {
    return "";
  }

  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp) || !Number.isFinite(timestamp)) {
    return "";
  }

  const diffMs = Math.max(0, Date.now() - timestamp);
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }

  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

function getExtension(name: string) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

export function detectPreviewKind(file: FileRecord) {
  const mime = file.mimeType?.toLowerCase() ?? "";
  const ext = getExtension(file.name);
  const imageExt = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
    ".avif",
  ]);
  const videoExt = new Set([".mp4", ".webm", ".ogg", ".mov", ".m4v"]);
  const audioExt = new Set([".mp3", ".wav", ".ogg", ".aac", ".m4a", ".flac"]);
  const markdownExt = new Set([".md", ".mdx"]);
  const documentExt = new Set([
    ".doc",
    ".docx",
    ".odm",
    ".odt",
    ".ott",
    ".rtf",
  ]);
  const presentationExt = new Set([".odp", ".otp", ".ppt", ".pptx"]);
  const spreadsheetExt = new Set([".csv", ".ods", ".ots", ".xls", ".xlsx"]);
  const libreOfficeOtherExt = new Set([".odb", ".odf", ".odg", ".otg"]);
  const documentMime = new Set([
    "application/msword",
    "application/rtf",
    "application/vnd.oasis.opendocument.text-master",
    "application/vnd.oasis.opendocument.text-template",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]);
  const presentationMime = new Set([
    "application/vnd.ms-powerpoint",
    "application/vnd.oasis.opendocument.presentation",
    "application/vnd.oasis.opendocument.presentation-template",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ]);
  const spreadsheetMime = new Set([
    "application/csv",
    "application/vnd.ms-excel",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.spreadsheet-template",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ]);
  const libreOfficeOtherMime = new Set([
    "application/vnd.oasis.opendocument.database",
    "application/vnd.oasis.opendocument.formula",
    "application/vnd.oasis.opendocument.graphics",
    "application/vnd.oasis.opendocument.graphics-template",
  ]);

  return {
    isDocument:
      documentMime.has(mime) ||
      libreOfficeOtherMime.has(mime) ||
      documentExt.has(ext) ||
      libreOfficeOtherExt.has(ext),
    isImage: mime.startsWith("image/") || imageExt.has(ext),
    isPdf: mime === "application/pdf" || ext === ".pdf",
    isPresentation: presentationMime.has(mime) || presentationExt.has(ext),
    isSpreadsheet: spreadsheetMime.has(mime) || spreadsheetExt.has(ext),
    isVideo: mime.startsWith("video/") || videoExt.has(ext),
    isAudio: mime.startsWith("audio/") || audioExt.has(ext),
    isMarkdown: mime.includes("markdown") || markdownExt.has(ext),
  };
}
