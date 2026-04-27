import { type FileRouter, storage } from "@avenire/storage";

interface UploadThingError {
  code?: string;
  message?: string;
}

const UPLOAD_TOO_LARGE_MESSAGE = "File size exceeds the maximum allowed limit";

const UPLOADTHING_ERROR_CODES = {
  TOO_LARGE: "TOO_LARGE",
  FILE_LIMIT_EXCEEDED: "FILE_LIMIT_EXCEEDED",
  TOO_MANY_FILES: "TOO_MANY_FILES",
} as const;

export function getUploadErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const uploadError = error as UploadThingError;
    if (uploadError.code === UPLOADTHING_ERROR_CODES.TOO_LARGE) {
      return UPLOAD_TOO_LARGE_MESSAGE;
    }
    if (uploadError.code === UPLOADTHING_ERROR_CODES.FILE_LIMIT_EXCEEDED) {
      return "File limit exceeded for this upload type";
    }
    if (uploadError.code === UPLOADTHING_ERROR_CODES.TOO_MANY_FILES) {
      return "Too many files selected for upload";
    }
    const message = error.message.trim().toLowerCase();
    if (
      message.includes("metadata not received") ||
      message.includes("metadata not recieved") ||
      message === "metadata not received" ||
      message === "metadata not recieved"
    ) {
      return UPLOAD_TOO_LARGE_MESSAGE;
    }
    if (
      error.message.includes("Failed to upload") ||
      error.message.includes("to S3")
    ) {
      return "Upload failed. Please try again or check file size limits.";
    }
    return error.message;
  }
  return "An unknown error occurred during upload";
}

export const router = {
  imageUploader: storage({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => ({
    url: file.ufsUrl,
  })),
  fileExplorerUploader: storage({
    audio: { maxFileSize: "64MB", maxFileCount: 300 },
    image: { maxFileSize: "32MB", maxFileCount: 300 },
    pdf: { maxFileSize: "128MB", maxFileCount: 300 },
    text: { maxFileSize: "16MB", maxFileCount: 300 },
    blob: { maxFileSize: "64MB", maxFileCount: 300 },
    video: { maxFileSize: "1GB", maxFileCount: 300 },
  }).onUploadComplete(async ({ file }) => ({
    key: file.key,
    name: file.name,
    url: file.ufsUrl,
    contentType: file.type,
    size: file.size,
  })),
  chatAttachmentUploader: storage({
    image: { maxFileSize: "16MB", maxFileCount: 3 },
    video: { maxFileSize: "64MB", maxFileCount: 3 },
    pdf: { maxFileSize: "32MB", maxFileCount: 3 },
    text: { maxFileSize: "8MB", maxFileCount: 3 },
    blob: { maxFileSize: "32MB", maxFileCount: 3 },
  }).onUploadComplete(async ({ file }) => ({
    key: file.key,
    name: file.name,
    url: file.ufsUrl,
    contentType: file.type,
  })),
} satisfies FileRouter;

export type UploadRouter = typeof router;
