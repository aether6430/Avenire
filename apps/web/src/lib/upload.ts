import { type FileRouter, storage } from "@avenire/storage";

export const router: FileRouter = {
  imageUploader: storage(
    {
      image: { maxFileSize: "4MB", maxFileCount: 1 },
    },
    {
      awaitServerData: false,
    }
  ).onUploadComplete(async ({ file }) => ({
    url: file.ufsUrl,
  })),
  fileExplorerUploader: storage(
    {
      audio: { maxFileSize: "64MB", maxFileCount: 300 },
      image: { maxFileSize: "32MB", maxFileCount: 300 },
      pdf: { maxFileSize: "128MB", maxFileCount: 300 },
      text: { maxFileSize: "16MB", maxFileCount: 300 },
      blob: { maxFileSize: "64MB", maxFileCount: 300 },
      video: { maxFileSize: "1GB", maxFileCount: 300 },
    },
    {
      awaitServerData: false,
    }
  ).onUploadComplete(async ({ file }) => ({
    key: file.key,
    name: file.name,
    url: file.ufsUrl,
    contentType: file.type,
    size: file.size,
  })),
  chatAttachmentUploader: storage(
    {
      image: { maxFileSize: "16MB", maxFileCount: 3 },
      video: { maxFileSize: "64MB", maxFileCount: 3 },
      pdf: { maxFileSize: "32MB", maxFileCount: 3 },
      text: { maxFileSize: "8MB", maxFileCount: 3 },
      blob: { maxFileSize: "32MB", maxFileCount: 3 },
    },
    {
      awaitServerData: false,
    }
  ).onUploadComplete(async ({ file }) => ({
    key: file.key,
    name: file.name,
    url: file.ufsUrl,
    contentType: file.type,
  })),
};

export type UploadRouter = typeof router;
