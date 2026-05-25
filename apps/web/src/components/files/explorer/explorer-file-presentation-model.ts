import {
  detectPreviewKind,
  type FileRecord,
  normalizeFilePageIcon,
} from "@/components/files/explorer/shared";
import type { WorkspaceFileIndexEntry } from "@/lib/workspace-file-index";

export type ExplorerFileKind =
  | "archive"
  | "audio"
  | "code"
  | "document"
  | "image"
  | "other"
  | "sheet"
  | "video";

export type ExplorerFileVisualDescriptor =
  | {
      glyph: string;
      kind: "custom-glyph";
    }
  | {
      kind: "custom-image";
      src: string;
    }
  | {
      fileKind: ExplorerFileKind;
      kind: "type-icon";
    };

export interface ExplorerWikiLinkableFile {
  content: string;
  excerpt: string;
  id: string;
  title: string;
}

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".avif",
  ".bmp",
  ".ico",
]);
const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".webm",
  ".ogg",
  ".mov",
  ".m4v",
  ".avi",
  ".mkv",
]);
const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".ogg",
  ".aac",
  ".m4a",
  ".flac",
]);
const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".java",
  ".c",
  ".cpp",
  ".cs",
  ".go",
  ".rs",
  ".php",
  ".rb",
  ".json",
  ".yaml",
  ".yml",
  ".xml",
  ".html",
  ".css",
  ".scss",
  ".sql",
]);
const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx"]);
const ARCHIVE_EXTENSIONS = new Set([
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".bz2",
  ".xz",
]);
const SHEET_EXTENSIONS = new Set([".csv", ".xls", ".xlsx"]);

function getExplorerFileExtension(name: string) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function isExplorerRenderableIconUrl(icon: string) {
  return (
    icon.startsWith("http://") ||
    icon.startsWith("https://") ||
    icon.startsWith("/") ||
    icon.startsWith("data:image/")
  );
}

export function getExplorerFileKind(file: FileRecord): ExplorerFileKind {
  const mime = file.mimeType?.toLowerCase() ?? "";
  const extension = getExplorerFileExtension(file.name);

  if (mime.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }
  if (mime === "application/pdf" || extension === ".pdf") {
    return "document";
  }
  if (mime.includes("markdown") || MARKDOWN_EXTENSIONS.has(extension)) {
    return "document";
  }
  if (mime.startsWith("video/") || VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }
  if (mime.startsWith("audio/") || AUDIO_EXTENSIONS.has(extension)) {
    return "audio";
  }
  if (SHEET_EXTENSIONS.has(extension)) {
    return "sheet";
  }
  if (CODE_EXTENSIONS.has(extension)) {
    return "code";
  }
  if (ARCHIVE_EXTENSIONS.has(extension)) {
    return "archive";
  }

  return "other";
}

export function buildExplorerFileVisualDescriptor(
  file: Pick<FileRecord, "page">,
  fileKind: ExplorerFileKind
): ExplorerFileVisualDescriptor {
  const customIcon = normalizeFilePageIcon(file.page?.icon);

  if (customIcon) {
    if (isExplorerRenderableIconUrl(customIcon)) {
      return {
        kind: "custom-image",
        src: customIcon,
      };
    }

    return {
      glyph: customIcon,
      kind: "custom-glyph",
    };
  }

  return {
    fileKind,
    kind: "type-icon",
  };
}

export function canStartExplorerFileHoverPreview(file: FileRecord) {
  const { isAudio, isVideo } = detectPreviewKind(file);
  return isAudio || isVideo;
}

export function buildExplorerWikiLinkableFiles(
  fileEntries: WorkspaceFileIndexEntry<FileRecord>[]
): ExplorerWikiLinkableFile[] {
  return fileEntries.map(({ file, workspacePath }) => {
    const extension = getExplorerFileExtension(file.name);
    const isMarkdown =
      (file.mimeType?.toLowerCase() ?? "").includes("markdown") ||
      extension === ".md" ||
      extension === ".mdx";

    return {
      content: "",
      excerpt: workspacePath,
      id: file.id,
      title: isMarkdown ? file.name.replace(/\.(md|mdx)$/i, "") : file.name,
    };
  });
}
