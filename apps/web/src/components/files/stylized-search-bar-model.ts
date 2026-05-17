import {
  FileAudio as FileAudio2,
  FileCode as FileCode2,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  Globe,
} from "@phosphor-icons/react";
import type { UIMessage } from "ai";
import type {
  WorkspaceSearchItem,
  WorkspaceSearchResult,
} from "@/components/files/search-model";

export const toResultKey = (result: WorkspaceSearchResult): string =>
  result.chunkId ? `${result.id}:${result.chunkId}` : result.id;

export const getMessageTextContent = (
  message: UIMessage | undefined
): string => {
  if (!message?.parts?.length) {
    return "";
  }

  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text"
    )
    .map((part) => part.text)
    .join("")
    .trim();
};

export const getResultIcon = (result: WorkspaceSearchResult) => {
  switch (result.sourceType) {
    case "folder":
      return Folder;
    case "image":
      return FileImage;
    case "video":
      return FileVideo;
    case "audio":
      return FileAudio2;
    case "markdown":
      return FileCode2;
    case "link":
      return Globe;
    default:
      return FileText;
  }
};

const formatTimestamp = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const getResultMeta = (result: WorkspaceSearchResult) => {
  const parts: string[] = [];

  if (typeof result.page === "number" && result.page > 0) {
    parts.push(`Page ${result.page}`);
  }

  if (typeof result.startMs === "number") {
    const start = formatTimestamp(result.startMs);
    if (typeof result.endMs === "number" && result.endMs > result.startMs) {
      parts.push(`${start}-${formatTimestamp(result.endMs)}`);
    } else {
      parts.push(start);
    }
  }

  return parts.join(" • ");
};

export const getScoreLabel = (score: number) =>
  `${Math.min(100, Math.max(0, Math.round(score * 100)))}%`;

export const toFastResult = (
  item: WorkspaceSearchItem
): WorkspaceSearchResult => ({
  description: item.description,
  fileId: item.type === "file" ? item.id : null,
  folderId: item.folderId ?? null,
  id: item.id,
  path: item.path,
  score: 1,
  snippet: item.snippet || "Name match",
  sourceType: item.type,
  title: item.title,
  type: item.type,
  workspaceUuid: item.workspaceUuid,
});
