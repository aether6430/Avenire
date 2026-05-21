import {
  detectPreviewKind,
  type FileRecord,
  normalizeFilePageIcon,
} from "@/components/files/explorer/shared";
import type { WorkspaceSearchResult } from "@/components/files/search-model";
import { buildVideoPlaybackDescriptor } from "@/lib/media-playback";
import {
  buildFilePreviewRetrievalModel,
  type FilePreviewRetrievalModel,
} from "./file-preview-retrieval-model";

export function getActiveFileLinkSourceUrl(activeFile: FileRecord) {
  return activeFile.metadata &&
    typeof activeFile.metadata === "object" &&
    !Array.isArray(activeFile.metadata) &&
    activeFile.metadata.link &&
    typeof activeFile.metadata.link === "object" &&
    !Array.isArray(activeFile.metadata.link) &&
    typeof (activeFile.metadata.link as Record<string, unknown>).sourceUrl ===
      "string"
    ? ((activeFile.metadata.link as Record<string, unknown>)
        .sourceUrl as string)
    : null;
}

export function getActiveMarkdownFileRoute(input: {
  fileId: string;
  folderId: string;
  workspaceUuid: string;
}) {
  const params = new URLSearchParams();
  params.set("file", input.fileId);

  return `/workspace/files/${input.workspaceUuid}/folder/${input.folderId}?${params.toString()}`;
}

export interface FilePreviewPanelDerivedState {
  activeCustomIcon: string | null;
  activeFileSourceUrl: string;
  activeLinkSourceUrl: string | null;
  activeMediaStreamUrl: string;
  activePlaybackDescriptor: ReturnType<typeof buildVideoPlaybackDescriptor>;
  activeVideoCaptionsSrc?: string;
  isAudio: boolean;
  isImage: boolean;
  isMarkdown: boolean;
  isPdf: boolean;
  isVideo: boolean;
  retrievalModel: FilePreviewRetrievalModel;
}

export function buildFilePreviewPanelDerivedState(input: {
  activeFile: FileRecord;
  activeFileIsMarkdown: boolean;
  activeRetrievalChunkId: string | null;
  mediaStreamFailed: boolean;
  query: string;
  retrievalResults: WorkspaceSearchResult[];
  workspaceUuid: string;
}): FilePreviewPanelDerivedState {
  const activeCustomIcon = normalizeFilePageIcon(input.activeFile.page?.icon);
  const activeLinkSourceUrl = getActiveFileLinkSourceUrl(input.activeFile);
  const activeFileSourceUrl = input.activeFileIsMarkdown
    ? (activeLinkSourceUrl ??
      getActiveMarkdownFileRoute({
        fileId: input.activeFile.id,
        folderId: input.activeFile.folderId,
        workspaceUuid: input.workspaceUuid,
      }))
    : input.activeFile.storageUrl;
  const activeMediaStreamUrl = `/api/workspaces/${input.workspaceUuid}/files/${input.activeFile.id}/stream`;
  const activePlaybackDescriptor = buildVideoPlaybackDescriptor({
    fallbackUrl: activeMediaStreamUrl,
    mimeType: input.activeFile.mimeType,
    videoDelivery: input.mediaStreamFailed
      ? null
      : input.activeFile.videoDelivery,
  });
  const activeVideoCaptionsSrc = (input.activeFile.mimeType ?? "")
    .toLowerCase()
    .startsWith("video/")
    ? `/api/workspaces/${input.workspaceUuid}/files/${input.activeFile.id}/captions.vtt`
    : undefined;
  const retrievalModel = buildFilePreviewRetrievalModel({
    activeFileId: input.activeFile.id,
    activeRetrievalChunkId: input.activeRetrievalChunkId,
    query: input.query,
    retrievalResults: input.retrievalResults,
  });
  const { isAudio, isImage, isMarkdown, isPdf, isVideo } = detectPreviewKind(
    input.activeFile
  );

  return {
    activeCustomIcon,
    activeFileSourceUrl,
    activeLinkSourceUrl,
    activeMediaStreamUrl,
    activePlaybackDescriptor,
    activeVideoCaptionsSrc,
    isAudio,
    isImage,
    isMarkdown,
    isPdf,
    isVideo,
    retrievalModel,
  };
}
