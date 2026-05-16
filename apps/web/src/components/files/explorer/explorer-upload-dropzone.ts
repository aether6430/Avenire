"use client";

import type { DragEvent } from "react";
import {
  type ExplorerUploadCandidate,
  sanitizeUploadCandidates,
} from "@/components/files/explorer/explorer-upload-model";

interface WebkitFileSystemEntry {
  isDirectory: boolean;
  isFile: boolean;
  name: string;
}

interface WebkitFileSystemFileEntry extends WebkitFileSystemEntry {
  file: (
    callback: (file: File) => void,
    errorCallback?: (error: DOMException) => void
  ) => void;
}

interface WebkitFileSystemDirectoryReader {
  readEntries: (
    callback: (entries: WebkitFileSystemEntry[]) => void,
    errorCallback?: (error: DOMException) => void
  ) => void;
}

interface WebkitFileSystemDirectoryEntry extends WebkitFileSystemEntry {
  createReader: () => WebkitFileSystemDirectoryReader;
}

export async function collectDroppedExplorerUploadCandidates(
  event: DragEvent<HTMLDivElement>
): Promise<ExplorerUploadCandidate[]> {
  const items = Array.from(event.dataTransfer.items ?? []);
  const candidates: ExplorerUploadCandidate[] = [];

  const readDirectoryEntries = async (
    reader: WebkitFileSystemDirectoryReader
  ): Promise<WebkitFileSystemEntry[]> => {
    const entries: WebkitFileSystemEntry[] = [];
    let iterations = 0;
    const maxReadIterations = 10_000;

    while (true) {
      iterations += 1;
      if (iterations > maxReadIterations) {
        console.warn("Stopped reading directory entries after max iterations");
        break;
      }
      const chunk = await new Promise<WebkitFileSystemEntry[]>((resolve) =>
        reader.readEntries(resolve, () => resolve([]))
      );
      if (chunk.length === 0) {
        break;
      }
      entries.push(...chunk);
    }

    return entries;
  };

  const walkEntry = async (
    entry: WebkitFileSystemEntry,
    parentPath: string
  ) => {
    if (entry.isFile) {
      const fileEntry = entry as WebkitFileSystemFileEntry;
      const file = await new Promise<File | null>((resolve) =>
        fileEntry.file(resolve, () => resolve(null))
      );
      if (!file) {
        return;
      }
      const relativePath = parentPath
        ? `${parentPath}/${file.name}`
        : file.name;
      candidates.push({ file, relativePath });
      return;
    }

    if (entry.isDirectory) {
      const directoryEntry = entry as WebkitFileSystemDirectoryEntry;
      const nextPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
      const children = await readDirectoryEntries(
        directoryEntry.createReader()
      );
      for (const child of children) {
        await walkEntry(child, nextPath);
      }
    }
  };

  let usedEntryApi = false;
  for (const item of items) {
    const maybeEntry = (
      item as DataTransferItem & {
        webkitGetAsEntry?: () => WebkitFileSystemEntry | null;
      }
    ).webkitGetAsEntry?.();
    if (!maybeEntry) {
      continue;
    }
    usedEntryApi = true;
    await walkEntry(maybeEntry, "");
  }

  const fallbackCandidates = Array.from(event.dataTransfer.files ?? []).map(
    (file) => {
      const webkitRelativePath = (
        file as File & { webkitRelativePath?: string }
      ).webkitRelativePath;
      return {
        file,
        relativePath: webkitRelativePath || file.name,
      };
    }
  );

  if (usedEntryApi && candidates.length > 0) {
    return sanitizeUploadCandidates([...candidates, ...fallbackCandidates]);
  }

  return sanitizeUploadCandidates(fallbackCandidates);
}
