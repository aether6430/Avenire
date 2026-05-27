import "server-only";
import { spawn } from "node:child_process";
import { lookup } from "node:dns/promises";
import {
  mkdir,
  mkdtemp,
  open,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { isIP } from "node:net";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { uploadStorageFile } from "@avenire/storage";
import type { VideoDeliveryRecord } from "@/lib/file-data";
import { isTrustedStorageUrl } from "@/lib/file-data";
import {
  buildAssetStem,
  buildHlsVariants,
  buildMp4Name,
  isPrivateOrLocalAddress,
  rewritePlaylistReferences,
  shouldGenerateHls,
  type VideoAnalysis,
} from "@/lib/video-optimization-model";

const DOWNLOAD_MAX_BYTES = 500 * 1024 * 1024;
const FFMPEG_TIMEOUT_MS = 3 * 60_000;
const DEFAULT_MAX_UPLOAD_BUFFER_BYTES = 500 * 1024 * 1024;
const HLS_DURATION_THRESHOLD_SECONDS = 180;
const HLS_RESOLUTION_THRESHOLD = 1920;
const HLS_SEGMENT_DURATION_SECONDS = 2;
const HLS_PLAYLIST_VERSION = 7;
const HLS_SIZE_THRESHOLD_BYTES = 80 * 1024 * 1024;
const HLS_UPLOAD_BATCH_SIZE = 10;
const parsedMaxUploadBufferBytes = Number.parseInt(
  process.env.VIDEO_OPTIMIZATION_MAX_UPLOAD_BUFFER_BYTES ?? "",
  10
);
const MAX_UPLOAD_BUFFER_BYTES =
  Number.isFinite(parsedMaxUploadBufferBytes) && parsedMaxUploadBufferBytes > 0
    ? parsedMaxUploadBufferBytes
    : DEFAULT_MAX_UPLOAD_BUFFER_BYTES;

interface OptimizeAndReuploadVideoInput {
  sourceName: string;
  sourceUrl: string;
}

export interface StoredAsset {
  mimeType: string;
  name: string;
  sizeBytes: number;
  storageKey: string;
  storageUrl: string;
}

interface GeneratedHlsVariant {
  bitrateKbps: number;
  height: number | null;
  initFileName: string;
  playlistName: string;
  playlistPath: string;
  segmentNames: string[];
  width: number | null;
}

export interface OptimizedVideoUpload {
  progressive: StoredAsset;
  videoDelivery: VideoDeliveryRecord;
}

const parsedVideoOptFetchTimeoutMs = Number.parseInt(
  process.env.VIDEO_OPT_FETCH_TIMEOUT_MS ?? "",
  10
);
const VIDEO_OPT_FETCH_TIMEOUT_MS = Math.max(
  5000,
  Number.isFinite(parsedVideoOptFetchTimeoutMs) &&
    parsedVideoOptFetchTimeoutMs > 0
    ? parsedVideoOptFetchTimeoutMs
    : 25_000
);

function getUploadThingToken() {
  const token = process.env.UPLOADTHING_TOKEN?.trim();
  if (!(token && token !== "undefined" && token !== "null")) {
    return null;
  }
  return token;
}

export async function validateSourceUrl(sourceUrlInput: string) {
  const trimmed = sourceUrlInput.trim();
  if (!trimmed) {
    throw new Error("Missing source URL");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Invalid source URL");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Source URL must be HTTP(S)");
  }

  if (parsed.hostname === "localhost") {
    throw new Error("Localhost source URLs are not allowed");
  }

  if (isTrustedStorageUrl(parsed.toString())) {
    return parsed.toString();
  }

  if (isIP(parsed.hostname)) {
    if (isPrivateOrLocalAddress(parsed.hostname)) {
      throw new Error("Source URL resolves to a private address");
    }
    return parsed.toString();
  }

  const resolved = await lookup(parsed.hostname, { all: true });
  if (!Array.isArray(resolved) || resolved.length === 0) {
    throw new Error("Unable to validate source URL");
  }
  if (resolved.some((entry) => isPrivateOrLocalAddress(entry.address))) {
    throw new Error("Source URL resolves to a private address");
  }

  return parsed.toString();
}

async function runCommand(command: "ffmpeg" | "ffprobe", args: string[]) {
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill("SIGKILL");
      reject(
        new Error(
          `${command} timed out after ${FFMPEG_TIMEOUT_MS}ms\n${stderr}`.trim()
        )
      );
    }, FFMPEG_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(stderr || `${command} exited with code ${code}`));
    });
  });
}

async function runFfmpeg(args: string[]) {
  await runCommand("ffmpeg", args);
}

async function analyzeVideo(inputPath: string): Promise<VideoAnalysis> {
  const stdout = await runCommand("ffprobe", [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_entries",
    "format=duration,bit_rate:stream=codec_type,width,height,bit_rate",
    inputPath,
  ]);

  const parsed = JSON.parse(stdout) as {
    format?: { bit_rate?: string; duration?: string };
    streams?: Array<{
      bit_rate?: string;
      codec_type?: string;
      height?: number;
      width?: number;
    }>;
  };
  const videoStream = parsed.streams?.find(
    (stream) => stream.codec_type === "video"
  );

  const parseMaybeNumber = (value: string | number | undefined) => {
    const numeric =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number.parseFloat(value)
          : Number.NaN;
    return Number.isFinite(numeric) ? numeric : null;
  };

  const bitrateBitsPerSecond =
    parseMaybeNumber(parsed.format?.bit_rate) ??
    parseMaybeNumber(videoStream?.bit_rate);

  return {
    bitrateKbps:
      bitrateBitsPerSecond === null
        ? null
        : Math.max(1, Math.round(bitrateBitsPerSecond / 1000)),
    durationSeconds: parseMaybeNumber(parsed.format?.duration),
    height:
      typeof videoStream?.height === "number" &&
      Number.isFinite(videoStream.height)
        ? videoStream.height
        : null,
    width:
      typeof videoStream?.width === "number" &&
      Number.isFinite(videoStream.width)
        ? videoStream.width
        : null,
  };
}

async function uploadBufferedFiles(
  files: Array<{
    name: string;
    path: string;
    type: string;
  }>
) {
  const uploaded = new Map<string, StoredAsset>();

  for (let index = 0; index < files.length; index += HLS_UPLOAD_BATCH_SIZE) {
    const batch = files.slice(index, index + HLS_UPLOAD_BATCH_SIZE);
    const prepared = await Promise.all(
      batch.map(async (file) => ({
        bytes: await readFile(file.path),
        ...file,
      }))
    );
    const results = await Promise.all(
      prepared.map((file) =>
        uploadStorageFile({
          body: file.bytes,
          contentType: file.type,
          name: file.name,
        })
      )
    );

    for (const [offset, uploadedFile] of results.entries()) {
      const source = prepared[offset];
      if (
        !(source && uploadedFile) ||
        typeof uploadedFile.key !== "string" ||
        typeof uploadedFile.url !== "string"
      ) {
        throw new Error(
          `Failed to upload generated asset batch for ${source?.name ?? "unknown asset"}`
        );
      }

      uploaded.set(source.name, {
        mimeType: source.type,
        name: source.name,
        sizeBytes: source.bytes.byteLength,
        storageKey: uploadedFile.key,
        storageUrl: uploadedFile.url,
      });
    }
  }

  return uploaded;
}

async function uploadSingleAsset(file: {
  name: string;
  path: string;
  type: string;
}) {
  const uploaded = await uploadBufferedFiles([file]);
  const asset = uploaded.get(file.name);
  if (!asset) {
    throw new Error(`Failed to upload ${file.name}`);
  }
  return asset;
}

async function createPosterAsset(
  inputPath: string,
  assetStem: string,
  analysis: VideoAnalysis,
  tempDir: string
) {
  const posterPath = join(tempDir, `${assetStem}-poster.jpg`);
  const seekSeconds =
    typeof analysis.durationSeconds === "number" && analysis.durationSeconds < 1
      ? 0.2
      : 1;

  await runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    `${seekSeconds}`,
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    posterPath,
  ]);

  return await uploadSingleAsset({
    name: basename(posterPath),
    path: posterPath,
    type: "image/jpeg",
  });
}

async function generateHlsAssets(
  inputPath: string,
  assetStem: string,
  analysis: VideoAnalysis,
  hlsDir: string
) {
  const variants = buildHlsVariants(analysis);
  const generatedVariants: GeneratedHlsVariant[] = [];

  for (const variant of variants) {
    const playlistName = `${assetStem}-${variant.label}.m3u8`;
    const playlistPath = join(hlsDir, playlistName);
    const initFileName = `${assetStem}-${variant.label}-init.mp4`;
    const segmentPattern = join(
      hlsDir,
      `${assetStem}-${variant.label}-%03d.m4s`
    );

    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      inputPath,
      "-map",
      "0:v:0?",
      "-map",
      "0:a:0?",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-profile:v",
      "main",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-force_key_frames",
      `expr:gte(t,n_forced*${HLS_SEGMENT_DURATION_SECONDS})`,
      "-sc_threshold",
      "0",
      "-b:v",
      `${variant.bitrateKbps}k`,
      "-maxrate",
      `${Math.round(variant.bitrateKbps * 1.1)}k`,
      "-bufsize",
      `${Math.round(variant.bitrateKbps * 1.5)}k`,
      "-hls_time",
      `${HLS_SEGMENT_DURATION_SECONDS}`,
      "-hls_list_size",
      "0",
      "-hls_playlist_type",
      "vod",
      "-hls_segment_type",
      "fmp4",
      "-hls_fmp4_init_filename",
      initFileName,
      "-hls_flags",
      "independent_segments",
      "-hls_segment_filename",
      segmentPattern,
    ];

    if (typeof variant.height === "number" && variant.height > 0) {
      args.push(
        "-vf",
        `scale=-2:${variant.height}:force_original_aspect_ratio=decrease`
      );
    }

    args.push(playlistPath);
    await runFfmpeg(args);

    const playlistText = await readFile(playlistPath, "utf8");
    const segmentNames = playlistText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    generatedVariants.push({
      bitrateKbps: variant.bitrateKbps,
      height: variant.height,
      initFileName,
      playlistName,
      playlistPath,
      segmentNames,
      width: variant.width,
    });
  }

  const mediaObjectNames = Array.from(
    new Set(generatedVariants.flatMap((variant) => variant.segmentNames))
  );
  for (const variant of generatedVariants) {
    mediaObjectNames.push(variant.initFileName);
  }
  const uploadedMediaObjects = await uploadBufferedFiles(
    Array.from(new Set(mediaObjectNames)).map((name) => ({
      name,
      path: join(hlsDir, name),
      type:
        name.endsWith(".m4s") || name.endsWith(".mp4")
          ? "video/mp4"
          : "video/mp2t",
    }))
  );

  const uploadedVariantPlaylists = new Map<
    string,
    {
      asset: StoredAsset;
      bitrateKbps: number;
      height: number | null;
      width: number | null;
    }
  >();

  for (const variant of generatedVariants) {
    const playlistText = await readFile(variant.playlistPath, "utf8");
    const rewritten = rewritePlaylistReferences(
      playlistText,
      new Map(
        [variant.initFileName, ...variant.segmentNames].flatMap((name) => {
          const asset = uploadedMediaObjects.get(name);
          return asset ? [[name, asset.storageUrl] as const] : [];
        })
      )
    );

    const rewrittenPath = join(hlsDir, `${variant.playlistName}.uploaded`);
    await writeFile(
      rewrittenPath,
      rewritten.endsWith("\n") ? rewritten : `${rewritten}\n`
    );

    const playlistAsset = await uploadSingleAsset({
      name: variant.playlistName,
      path: rewrittenPath,
      type: "application/vnd.apple.mpegurl",
    });
    uploadedVariantPlaylists.set(variant.playlistName, {
      asset: playlistAsset,
      bitrateKbps: variant.bitrateKbps,
      height: variant.height,
      width: variant.width,
    });
  }

  const masterManifestName = `${assetStem}-master.m3u8`;
  const masterManifestPath = join(hlsDir, masterManifestName);
  const masterManifest = [
    "#EXTM3U",
    `#EXT-X-VERSION:${HLS_PLAYLIST_VERSION}`,
    "#EXT-X-INDEPENDENT-SEGMENTS",
    ...generatedVariants.map((variant) => {
      const playlist = uploadedVariantPlaylists.get(variant.playlistName);
      if (!playlist) {
        throw new Error(
          `Missing uploaded playlist for ${variant.playlistName}`
        );
      }
      const attributes = [
        `BANDWIDTH=${playlist.bitrateKbps * 1000}`,
        playlist.width && playlist.height
          ? `RESOLUTION=${playlist.width}x${playlist.height}`
          : null,
      ]
        .filter(Boolean)
        .join(",");

      return `#EXT-X-STREAM-INF:${attributes}\n${playlist.asset.storageUrl}`;
    }),
    "",
  ].join("\n");
  await writeFile(masterManifestPath, masterManifest);

  const masterManifestAsset = await uploadSingleAsset({
    name: masterManifestName,
    path: masterManifestPath,
    type: "application/vnd.apple.mpegurl",
  });

  return {
    manifest: masterManifestAsset,
    segmentStorageKeys: Array.from(uploadedMediaObjects.values()).map(
      (asset) => asset.storageKey
    ),
    variants: Array.from(uploadedVariantPlaylists.values()).map((variant) => ({
      bitrateKbps: variant.bitrateKbps,
      height: variant.height,
      playlistStorageKey: variant.asset.storageKey,
      playlistUrl: variant.asset.storageUrl,
      width: variant.width,
    })),
  };
}

export async function optimizeAndReuploadVideo(
  input: OptimizeAndReuploadVideoInput
): Promise<OptimizedVideoUpload | null> {
  const uploadThingToken = getUploadThingToken();
  if (!uploadThingToken) {
    return null;
  }

  const sourceUrl = await validateSourceUrl(input.sourceUrl);
  const tempDir = await mkdtemp(join(tmpdir(), "avenire-video-opt-"));
  const sourcePath = join(tempDir, "input");
  const remuxPath = join(tempDir, "remuxed.mp4");
  const transcodePath = join(tempDir, "transcoded.mp4");
  const hlsDir = join(tempDir, "hls");
  const assetStem = buildAssetStem(input.sourceName);

  try {
    await mkdir(hlsDir, { recursive: true });

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, VIDEO_OPT_FETCH_TIMEOUT_MS);

    const response = await fetch(sourceUrl, {
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timer);
    });
    if (!(response.ok && response.body)) {
      return null;
    }

    const sourceFile = await open(sourcePath, "w");
    const reader = response.body.getReader();
    let downloadedBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (!value) {
          continue;
        }
        downloadedBytes += value.byteLength;
        if (downloadedBytes > DOWNLOAD_MAX_BYTES) {
          throw new Error("Source video exceeds maximum download size");
        }
        await sourceFile.write(value);
      }
    } finally {
      await sourceFile.close();
      reader.releaseLock();
    }

    const analysis = await analyzeVideo(sourcePath);

    let optimizedPath = remuxPath;
    let requiresTranscode = false;
    try {
      await runFfmpeg([
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        sourcePath,
        "-movflags",
        "+faststart",
        "-c",
        "copy",
        remuxPath,
      ]);
    } catch {
      optimizedPath = transcodePath;
      requiresTranscode = true;
      await runFfmpeg([
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        sourcePath,
        "-map",
        "0:v:0?",
        "-map",
        "0:a:0?",
        "-movflags",
        "+faststart",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        transcodePath,
      ]);
    }

    const optimizedStats = await stat(optimizedPath);
    if (optimizedStats.size > MAX_UPLOAD_BUFFER_BYTES) {
      throw new Error(
        `Optimized video exceeds upload buffer limit (${MAX_UPLOAD_BUFFER_BYTES} bytes)`
      );
    }

    const progressive = await uploadSingleAsset({
      name: buildMp4Name(input.sourceName),
      path: optimizedPath,
      type: "video/mp4",
    });

    const poster = await createPosterAsset(
      optimizedPath,
      assetStem,
      analysis,
      tempDir
    ).catch(() => null);

    const shouldCreateHls = shouldGenerateHls({
      analysis,
      hlsSizeThresholdBytes: HLS_SIZE_THRESHOLD_BYTES,
      requiresTranscode,
      sourceSizeBytes: downloadedBytes,
    });
    const hls = shouldCreateHls
      ? await generateHlsAssets(optimizedPath, assetStem, analysis, hlsDir)
      : null;

    return {
      progressive,
      videoDelivery: {
        analysis: {
          bitrateKbps: analysis.bitrateKbps,
          durationSeconds: analysis.durationSeconds,
          height: analysis.height,
          width: analysis.width,
        },
        hls: hls
          ? {
              manifestStorageKey: hls.manifest.storageKey,
              manifestUrl: hls.manifest.storageUrl,
              segmentDurationSeconds: HLS_SEGMENT_DURATION_SECONDS,
              segmentStorageKeys: hls.segmentStorageKeys,
              variants: hls.variants,
            }
          : null,
        poster: poster
          ? {
              mimeType: poster.mimeType,
              storageKey: poster.storageKey,
              url: poster.storageUrl,
            }
          : null,
        progressive: {
          mimeType: progressive.mimeType,
          sizeBytes: progressive.sizeBytes,
          storageKey: progressive.storageKey,
          url: progressive.storageUrl,
        },
        status: "ready",
        strategy: hls ? "hybrid" : "progressive",
        updatedAt: new Date().toISOString(),
        version: 1,
      },
    };
  } catch {
    return null;
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}
