"use client";

type FileCardType =
  | "archive"
  | "audio"
  | "code"
  | "document"
  | "image"
  | "other"
  | "video";

export { FileCard } from "@/components/files/file-card";
export { MarkdownThumbnail } from "@/components/files/markdown-thumbnail";
export { PdfThumbnail } from "@/components/files/pdf-thumbnail";
export { VideoThumbnail } from "@/components/files/video-thumbnail";
