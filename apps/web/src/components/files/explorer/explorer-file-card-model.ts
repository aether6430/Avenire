import type { MediaPlaybackSource } from "@avenire/ui/media";
import type { ExplorerCardFileType } from "@/components/files/explorer/explorer-cards-shared";
import {
  formatCardPropertyValue,
  getFileProperties,
} from "@/components/files/explorer/explorer-file-properties-model";
import {
  detectPreviewKind,
  type FileRecord,
  normalizeFilePageIcon,
} from "@/components/files/explorer/shared";
import type { FileCardType } from "@/components/files/file-card";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";
import {
  buildProgressivePlaybackSource,
  buildVideoPlaybackDescriptor,
} from "@/lib/media-playback";

export interface ExplorerFileCardDetail {
  label: string;
  value: string;
}

export type ExplorerFileCardPreviewModel =
  | { alt: string; kind: "image"; src: string }
  | {
      kind: "video";
      openedCached: boolean;
      playbackSource: MediaPlaybackSource;
      posterUrl?: string | null;
      sizeBytes: number;
      warm: boolean;
    }
  | { content: string | null; kind: "markdown" }
  | { kind: "pdf"; src: string }
  | { kind: "none" };

export interface ExplorerFileCardModel {
  details: ExplorerFileCardDetail[];
  displayName: string;
  preview: ExplorerFileCardPreviewModel;
  resolvedFileType: FileCardType;
}

export function buildExplorerFileCardModel(input: {
  displayName: string;
  file: FileRecord;
  fileType: ExplorerCardFileType;
  isPreviewing: boolean;
  isWarmed: boolean;
  openedCached: boolean;
  selectedCardPropertyDefinitions: WorkspacePropertyDefinition[];
}): ExplorerFileCardModel {
  const { isImage, isMarkdown, isPdf, isVideo } = detectPreviewKind(input.file);
  const fileProperties = getFileProperties(input.file);
  const details = input.selectedCardPropertyDefinitions
    .map((definition) => {
      const property = fileProperties[definition.key];
      if (!property) {
        return null;
      }

      const value = formatCardPropertyValue(property);
      if (!value) {
        return null;
      }

      return {
        label: definition.key,
        value,
      };
    })
    .filter((entry): entry is ExplorerFileCardDetail => Boolean(entry));

  const filePageIcon = normalizeFilePageIcon(input.file.page?.icon);
  const displayName = filePageIcon
    ? `${filePageIcon} ${input.displayName}`
    : input.displayName;
  const resolvedFileType: FileCardType =
    input.fileType === "sheet" ? "document" : input.fileType;

  if (isImage) {
    return {
      details,
      displayName,
      preview: {
        alt: input.file.name,
        kind: "image",
        src: input.file.storageUrl,
      },
      resolvedFileType,
    };
  }

  if (isVideo) {
    const descriptor = buildVideoPlaybackDescriptor({
      fallbackUrl: input.file.storageUrl,
      mimeType: input.file.mimeType,
      videoDelivery: input.file.videoDelivery,
    });

    return {
      details,
      displayName,
      preview: {
        kind: "video",
        openedCached: input.openedCached || input.isWarmed,
        playbackSource:
          descriptor?.preferredSource ??
          buildProgressivePlaybackSource(
            input.file.storageUrl,
            input.file.mimeType
          ),
        posterUrl: descriptor?.posterUrl,
        sizeBytes: input.file.sizeBytes,
        warm: input.isPreviewing,
      },
      resolvedFileType,
    };
  }

  if (isMarkdown) {
    return {
      details,
      displayName,
      preview: {
        content: input.file.noteContent ?? null,
        kind: "markdown",
      },
      resolvedFileType,
    };
  }

  if (isPdf) {
    return {
      details,
      displayName,
      preview: {
        kind: "pdf",
        src: input.file.storageUrl,
      },
      resolvedFileType,
    };
  }

  return {
    details,
    displayName,
    preview: { kind: "none" },
    resolvedFileType,
  };
}
