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
  file,
  name,
  previewUrl,
  source,
  status,
}: Pick<
  Partial<Attachment>,
  "contentType" | "file" | "name" | "source" | "status"
> & {
  previewUrl?: string | null;
}): PreviewAttachmentCapabilities {
  const isCodePreview = isPreviewAttachmentCodeLike(contentType, name);
  const isLocalAttachment = source === "local";
  const canUseUrlPreview = Boolean(
    previewUrl && (status === "completed" || isLocalAttachment)
  );
  const canUseCodePreview = Boolean(
    isCodePreview && (file || canUseUrlPreview)
  );
  const isImagePreview = Boolean(
    contentType?.startsWith("image") && canUseUrlPreview
  );
  const isVideoPreview = Boolean(
    contentType?.startsWith("video") && canUseUrlPreview
  );
  const isPdfPreview = Boolean(
    contentType === "application/pdf" && canUseUrlPreview
  );

  return {
    canPreview: Boolean(
      isImagePreview || isVideoPreview || isPdfPreview || canUseCodePreview
    ),
    isCodePreview,
    isImagePreview,
    isPdfPreview,
    isVideoPreview,
  };
}
