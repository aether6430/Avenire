import type { Attachment } from "@/components/chat/attachment";

const CODE_MIME_MATCHERS = [
  "application/json",
  "application/javascript",
  "application/typescript",
  "text/javascript",
  "text/typescript",
  "text/x-python",
  "text/x-c",
  "text/x-c++",
  "text/x-java",
  "text/x-rust",
  "text/html",
  "text/css",
];

const CODE_EXTENSIONS = [
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "py",
  "md",
  "go",
  "rs",
  "java",
  "cpp",
  "c",
  "sql",
  "yaml",
  "yml",
  "sh",
];

export interface PreviewAttachmentCapabilities {
  canPreview: boolean;
  isCodePreview: boolean;
  isImagePreview: boolean;
  isPdfPreview: boolean;
  isVideoPreview: boolean;
}

export function isPreviewAttachmentCodeLike(
  contentType?: string,
  name?: string
) {
  if (!(contentType || name)) {
    return false;
  }

  if (
    contentType &&
    (CODE_MIME_MATCHERS.includes(contentType) ||
      contentType.startsWith("text/"))
  ) {
    return true;
  }

  const extension = name?.split(".").pop()?.toLowerCase();
  return Boolean(extension && CODE_EXTENSIONS.includes(extension));
}

export function formatPreviewAttachmentFileSize(sizeBytes?: number | null) {
  if (!sizeBytes) {
    return "";
  }

  const sizeInKB = sizeBytes / 1024;
  if (sizeInKB < 1024) {
    return `${sizeInKB.toFixed(1)}KB`;
  }

  return `${(sizeInKB / 1024).toFixed(1)}MB`;
}

export function buildPreviewAttachmentCapabilities({
  contentType,
  name,
  previewUrl,
  status,
}: Pick<Partial<Attachment>, "contentType" | "name" | "status"> & {
  previewUrl?: string | null;
}): PreviewAttachmentCapabilities {
  const isCodePreview = isPreviewAttachmentCodeLike(contentType, name);
  const isImagePreview = Boolean(
    contentType?.startsWith("image") && previewUrl && status === "completed"
  );
  const isVideoPreview = Boolean(
    contentType?.startsWith("video") && previewUrl && status === "completed"
  );
  const isPdfPreview = Boolean(
    contentType === "application/pdf" && previewUrl && status === "completed"
  );

  return {
    canPreview:
      status === "completed" &&
      Boolean(
        (isImagePreview || isVideoPreview || isPdfPreview || isCodePreview) &&
          previewUrl
      ),
    isCodePreview,
    isImagePreview,
    isPdfPreview,
    isVideoPreview,
  };
}
