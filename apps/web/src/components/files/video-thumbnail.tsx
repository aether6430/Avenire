"use client";

import { cn } from "@avenire/ui/lib/utils";
import type { MediaPlaybackSource } from "@avenire/ui/media";
import { useMediaPlaybackSource } from "@avenire/ui/media";
import { FileText } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import {
  primeMediaPlayback,
  releaseMediaPlaybackPrime,
  resolveCachedPlaybackSource,
} from "@/lib/file-preview-cache";
import { THUMBNAIL_SURFACE_CLASS } from "./file-card-thumbnail-shared";

export function VideoThumbnail({
  playbackSource,
  posterUrl,
  className,
  warm = false,
  openedCached = false,
  playOnHover = false,
  sizeBytes,
}: {
  playbackSource: MediaPlaybackSource;
  posterUrl?: string | null;
  className?: string;
  warm?: boolean;
  openedCached?: boolean;
  playOnHover?: boolean;
  sizeBytes?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [resolvedPlaybackSource, setResolvedPlaybackSource] = useState(() =>
    resolveCachedPlaybackSource(playbackSource)
  );
  const [failed, setFailed] = useState(false);

  useMediaPlaybackSource({
    mediaRef: videoRef,
    onError: () => setFailed(true),
    playbackSource: resolvedPlaybackSource,
  });

  useEffect(() => {
    setFailed(false);
    setResolvedPlaybackSource(resolveCachedPlaybackSource(playbackSource));
  }, [playbackSource]);

  useEffect(() => {
    if (!(warm || openedCached || playOnHover)) {
      return;
    }

    primeMediaPlayback(playbackSource, {
      mediaType: "video",
      posterUrl,
      sizeBytes,
      surface: "thumbnail",
    })
      .then(() => {
        setResolvedPlaybackSource(resolveCachedPlaybackSource(playbackSource));
      })
      .catch(() => {
        // Ignore warmup failures for thumbnails.
      });

    return () => {
      releaseMediaPlaybackPrime(playbackSource);
    };
  }, [openedCached, playOnHover, playbackSource, posterUrl, sizeBytes, warm]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (!(warm || openedCached)) {
      return;
    }

    const onMeta = () => {
      video.currentTime = 0;
    };
    video.addEventListener("loadedmetadata", onMeta, { once: true });
    video.load();
    return () => video.removeEventListener("loadedmetadata", onMeta);
  }, [openedCached, warm]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!playOnHover) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    const startPlayback = async () => {
      try {
        video.loop = true;
        await video.play();
      } catch {
        // Ignore autoplay failures for previews.
      }
    };

    startPlayback().catch(() => {
      // Ignore playback bootstrap failures for thumbnails.
    });

    return () => {
      video.pause();
      video.currentTime = 0;
    };
  }, [playOnHover]);

  if (failed) {
    return (
      <div className={cn(THUMBNAIL_SURFACE_CLASS, className)}>
        <FileText className="size-8 text-violet-500" />
      </div>
    );
  }

  return (
    <div className={cn(THUMBNAIL_SURFACE_CLASS, className)}>
      <video
        className="h-full w-full object-contain"
        muted
        onError={() => setFailed(true)}
        playsInline
        poster={posterUrl ?? undefined}
        preload={warm || openedCached || playOnHover ? "auto" : "none"}
        ref={videoRef}
      />
    </div>
  );
}
