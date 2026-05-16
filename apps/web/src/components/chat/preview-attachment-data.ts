import type { Attachment } from "@/components/chat/attachment";
import {
  buildProgressivePlaybackSource,
  type MediaPlaybackDescriptor,
} from "@/lib/media-playback";

const playbackDescriptorCache = new Map<
  string,
  MediaPlaybackDescriptor | Promise<MediaPlaybackDescriptor | null> | null
>();

export async function fetchPreviewAttachmentPlaybackDescriptor({
  contentType,
  url,
  workspaceFileId,
  workspaceUuid,
}: Pick<Partial<Attachment>, "contentType" | "url" | "workspaceFileId"> & {
  workspaceUuid?: string;
}): Promise<MediaPlaybackDescriptor | null> {
  if (!(contentType?.startsWith("video") && url)) {
    return null;
  }

  if (!(workspaceUuid && workspaceFileId)) {
    const progressive = buildProgressivePlaybackSource(url, contentType);
    return {
      fallbackSource: progressive,
      posterUrl: null,
      preferredSource: progressive,
      status: "ready",
    };
  }

  const cacheKey = `${workspaceUuid}:${workspaceFileId}`;
  const cached = playbackDescriptorCache.get(cacheKey);
  if (cached && !(cached instanceof Promise)) {
    return cached;
  }
  if (cached instanceof Promise) {
    return await cached;
  }

  const request = fetch(
    `/api/workspaces/${workspaceUuid}/files/${workspaceFileId}/playback`,
    {
      cache: "force-cache",
      credentials: "include",
    }
  )
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }
      return (await response.json()) as MediaPlaybackDescriptor;
    })
    .catch(() => null)
    .finally(() => {
      const current = playbackDescriptorCache.get(cacheKey);
      if (current === request) {
        playbackDescriptorCache.delete(cacheKey);
      }
    });

  playbackDescriptorCache.set(cacheKey, request);
  const resolved = await request;
  if (resolved?.status === "ready") {
    playbackDescriptorCache.set(cacheKey, resolved);
    return resolved;
  }

  playbackDescriptorCache.delete(cacheKey);
  const progressive = buildProgressivePlaybackSource(url, contentType);
  return {
    fallbackSource: progressive,
    posterUrl: null,
    preferredSource: progressive,
    status: "ready",
  };
}

export async function loadPreviewAttachmentText({
  file,
  previewUrl,
  source,
  workspaceFileId,
  workspaceUuid,
}: Pick<Partial<Attachment>, "file" | "source" | "workspaceFileId"> & {
  previewUrl?: string | null;
  workspaceUuid?: string;
}) {
  if (file) {
    return await file.text();
  }

  if (source === "workspace" && workspaceUuid && workspaceFileId) {
    const response = await fetch(
      `/api/workspaces/${workspaceUuid}/files/${workspaceFileId}/stream`,
      {
        headers: {
          Accept: "text/plain,text/markdown,text/*,*/*",
        },
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to load preview: ${response.status}`);
    }
    return await response.text();
  }

  if (!previewUrl) {
    throw new Error("No preview URL available");
  }

  const response = await fetch(previewUrl);
  if (!response.ok) {
    throw new Error(`Failed to load preview: ${response.status}`);
  }
  return await response.text();
}
