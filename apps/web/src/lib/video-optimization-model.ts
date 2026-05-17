import { randomUUID } from "node:crypto";
import { isIP } from "node:net";

const HLS_DURATION_THRESHOLD_SECONDS = 180;
const HLS_RESOLUTION_THRESHOLD = 1920;

export interface VideoAnalysis {
  bitrateKbps: number | null;
  durationSeconds: number | null;
  height: number | null;
  width: number | null;
}

export interface HlsVariantSpec {
  bitrateKbps: number;
  height: number | null;
  label: string;
  width: number | null;
}

export function isPrivateOrLocalAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address
      .split(".")
      .map((value) => Number.parseInt(value, 10));
    if (a === 10 || a === 127 || a === 0) {
      return true;
    }
    if (a === 169 && b === 254) {
      return true;
    }
    if (a === 192 && b === 168) {
      return true;
    }
    if (a === 172 && typeof b === "number" && b >= 16 && b <= 31) {
      return true;
    }
    return false;
  }

  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

export function buildMp4Name(sourceName: string) {
  const trimmed = sourceName.trim();
  if (!trimmed) {
    return "video.mp4";
  }

  const extension = trimmed.includes(".")
    ? trimmed.slice(trimmed.lastIndexOf("."))
    : "";
  if (!extension) {
    return `${trimmed}.mp4`;
  }

  return `${trimmed.slice(0, -extension.length)}.mp4`;
}

export function buildAssetStem(sourceName: string) {
  const extension = sourceName.trim().includes(".")
    ? sourceName.slice(sourceName.lastIndexOf("."))
    : "";
  const withoutExtension =
    extension.length > 0 ? sourceName.slice(0, -extension.length) : sourceName;
  const sanitized = withoutExtension
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${sanitized || "video"}-${randomUUID().slice(0, 8)}`;
}

export function shouldGenerateHls(input: {
  analysis: VideoAnalysis;
  requiresTranscode: boolean;
  sourceSizeBytes: number;
  hlsSizeThresholdBytes: number;
}) {
  const {
    analysis,
    requiresTranscode,
    sourceSizeBytes,
    hlsSizeThresholdBytes,
  } = input;
  return (
    requiresTranscode ||
    sourceSizeBytes > hlsSizeThresholdBytes ||
    (analysis.durationSeconds ?? 0) >= HLS_DURATION_THRESHOLD_SECONDS ||
    Math.max(analysis.width ?? 0, analysis.height ?? 0) >=
      HLS_RESOLUTION_THRESHOLD
  );
}

export function scaleWidthToEven(
  width: number,
  height: number,
  targetHeight: number
) {
  const scaled = Math.round((width / height) * targetHeight);
  return scaled % 2 === 0 ? scaled : scaled - 1;
}

export function buildHlsVariants(analysis: VideoAnalysis): HlsVariantSpec[] {
  if ((analysis.height ?? 0) >= 1080) {
    return [
      {
        bitrateKbps: 2800,
        height: 720,
        label: "720p",
        width:
          analysis.width && analysis.height
            ? scaleWidthToEven(analysis.width, analysis.height, 720)
            : 1280,
      },
      {
        bitrateKbps: 5000,
        height: 1080,
        label: "1080p",
        width:
          analysis.width && analysis.height
            ? scaleWidthToEven(analysis.width, analysis.height, 1080)
            : 1920,
      },
    ];
  }

  if ((analysis.height ?? 0) >= 720) {
    return [
      {
        bitrateKbps: 2800,
        height: 720,
        label: "720p",
        width:
          analysis.width && analysis.height
            ? scaleWidthToEven(analysis.width, analysis.height, 720)
            : 1280,
      },
    ];
  }

  return [
    {
      bitrateKbps: Math.max(900, analysis.bitrateKbps ?? 1400),
      height: analysis.height,
      label: "source",
      width: analysis.width,
    },
  ];
}

export function rewritePlaylistReferences(
  playlistText: string,
  replacements: Map<string, string>
) {
  return playlistText
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return line;
      }
      if (!trimmed.startsWith("#")) {
        return replacements.get(trimmed) ?? line;
      }
      return line.replace(/URI="([^"]+)"/g, (match, value: string) => {
        const replacement = replacements.get(value);
        if (!replacement) {
          return match;
        }
        return `URI="${replacement}"`;
      });
    })
    .join("\n");
}
