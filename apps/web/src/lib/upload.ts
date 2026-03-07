import { type FileRouter, storage } from "@avenire/storage";

export const router = {
  imageUploader: storage({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => ({
    url: file.ufsUrl,
  })),
  fileExplorerUploader: storage({
    image: { maxFileSize: "16MB", maxFileCount: 10 },
    pdf: { maxFileSize: "32MB", maxFileCount: 10 },
    text: { maxFileSize: "8MB", maxFileCount: 10 },
    blob: { maxFileSize: "32MB", maxFileCount: 10 },
    video: { maxFileSize: "128MB", maxFileCount: 5 },
  }).onUploadComplete(async ({ file }) => ({
    key: file.key,
    name: file.name,
    url: file.ufsUrl,
    contentType: file.type,
    size: file.size,
  })),
  chatAttachmentUploader: storage({
    image: { maxFileSize: "8MB", maxFileCount: 3 },
    video: { maxFileSize: "32MB", maxFileCount: 3 },
    pdf: { maxFileSize: "16MB", maxFileCount: 3 },
    text: { maxFileSize: "4MB", maxFileCount: 3 },
    blob: { maxFileSize: "16MB", maxFileCount: 3 },
  }).onUploadComplete(async ({ file }) => ({
    key: file.key,
    name: file.name,
    url: file.ufsUrl,
    contentType: file.type,
  })),
} satisfies FileRouter;

export type UploadRouter = typeof router;
