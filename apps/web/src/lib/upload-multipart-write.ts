import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { join } from "node:path";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import {
  getPartPath,
  getSessionDirectory,
  toSafePartNumber,
} from "@/lib/upload-multipart-paths";

export class MultipartUploadLimitError extends Error {
  readonly code:
    | "UPLOAD_PART_TOO_LARGE"
    | "UPLOAD_TOTAL_TOO_LARGE"
    | "UPLOAD_TOO_MANY_PARTS";

  constructor(code: MultipartUploadLimitError["code"], message: string) {
    super(message);
    this.name = "MultipartUploadLimitError";
    this.code = code;
  }
}

export function validateMultipartUsage(input: {
  bytesWithoutCurrentPart: number;
  maxPartBytes: number;
  maxPartCount: number;
  maxTotalBytes: number;
  partCountWithoutCurrentPart: number;
  proposedPartBytes: number;
}) {
  if (input.partCountWithoutCurrentPart + 1 > input.maxPartCount) {
    throw new MultipartUploadLimitError(
      "UPLOAD_TOO_MANY_PARTS",
      "Upload has too many parts"
    );
  }
  if (input.proposedPartBytes > input.maxPartBytes) {
    throw new MultipartUploadLimitError(
      "UPLOAD_PART_TOO_LARGE",
      "Upload part exceeds its byte budget"
    );
  }
  if (input.bytesWithoutCurrentPart + input.proposedPartBytes > input.maxTotalBytes) {
    throw new MultipartUploadLimitError(
      "UPLOAD_TOTAL_TOO_LARGE",
      "Upload exceeds its cumulative byte budget"
    );
  }
}

const sessionWrites = new Map<string, Promise<void>>();

async function withSessionWriteLock<A>(
  sessionId: string,
  run: () => Promise<A>
) {
  const previous = sessionWrites.get(sessionId) ?? Promise.resolve();
  let release = () => {};
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => current);
  sessionWrites.set(sessionId, queued);
  await previous;
  try {
    return await run();
  } finally {
    release();
    if (sessionWrites.get(sessionId) === queued) {
      sessionWrites.delete(sessionId);
    }
  }
}

async function getExistingMultipartUsage(input: {
  dir: string;
  partPath: string;
  partNumber: number;
}) {
  const manifestPath = join(input.dir, ".usage.json");
  const manifest = await readFile(manifestPath, "utf8")
    .then((value) => {
      const decoded: unknown = JSON.parse(value);
      if (
        typeof decoded !== "object" ||
        decoded === null ||
        !("parts" in decoded) ||
        typeof decoded.parts !== "object" ||
        decoded.parts === null ||
        Array.isArray(decoded.parts)
      ) {
        return null;
      }
      const parts = Object.fromEntries(
        Object.entries(decoded.parts).filter(
          (entry): entry is [string, number] =>
            typeof entry[1] === "number" &&
            Number.isFinite(entry[1]) &&
            entry[1] >= 0
        )
      );
      return { parts };
    })
    .catch(() => null);
  if (manifest?.parts) {
    const partSizes = Object.values(manifest.parts).filter(
      (size) => typeof size === "number" && Number.isFinite(size) && size >= 0
    );
    const existingSize = manifest.parts[String(input.partNumber)] ?? 0;
    return {
      bytesWithoutCurrentPart:
        partSizes.reduce((total, size) => total + size, 0) - existingSize,
      partCountWithoutCurrentPart:
        Object.keys(manifest.parts).length -
        (Object.hasOwn(manifest.parts, String(input.partNumber)) ? 1 : 0),
      manifestPath,
      parts: manifest.parts,
    };
  }
  const names = await readdir(input.dir).catch(() => [] as string[]);
  const partPaths = names.flatMap((name) =>
    /^\d+\.part$/.test(name) ? [join(input.dir, name)] : []
  );
  const [sizes, existingPart] = await Promise.all([
    Promise.all(
      partPaths.map(
        async (path) => (await stat(path).catch(() => null))?.size ?? 0
      )
    ),
    stat(input.partPath).catch(() => null),
  ]);
  return {
    bytesWithoutCurrentPart:
      sizes.reduce((total, size) => total + size, 0) -
      (existingPart?.size ?? 0),
    partCountWithoutCurrentPart:
      partPaths.length - (existingPart?.isFile() ? 1 : 0),
    manifestPath,
    parts: Object.fromEntries(
      await Promise.all(
        partPaths.map(async (path) => [
          /(?:^|\/)(\d+)\.part$/.exec(path)?.[1] ?? "",
          (await stat(path).catch(() => null))?.size ?? 0,
        ])
      )
    ),
  };
}

async function saveUsageManifest(input: {
  manifestPath: string;
  partNumber: number;
  parts: Record<string, number>;
  sizeBytes: number;
}) {
  const temporaryPath = `${input.manifestPath}.${randomUUID()}.tmp`;
  await writeFile(
    temporaryPath,
    JSON.stringify({
      parts: { ...input.parts, [String(input.partNumber)]: input.sizeBytes },
    })
  );
  await rename(temporaryPath, input.manifestPath);
}

export async function writeMultipartPart(input: {
  sessionId: string;
  partNumber: number;
  maxBytes: number;
  maxPartCount: number;
  maxTotalBytes: number;
  stream: ReadableStream<Uint8Array>;
}) {
  return withSessionWriteLock(input.sessionId, async () => {
    const dir = getSessionDirectory(input.sessionId);
    const partPath = getPartPath(input.sessionId, input.partNumber);
    await mkdir(dir, { recursive: true });
    const usage = await getExistingMultipartUsage({
      dir,
      partPath,
      partNumber: input.partNumber,
    });
    validateMultipartUsage({
      bytesWithoutCurrentPart: usage.bytesWithoutCurrentPart,
      maxPartBytes: input.maxBytes,
      maxPartCount: input.maxPartCount,
      maxTotalBytes: input.maxTotalBytes,
      partCountWithoutCurrentPart: usage.partCountWithoutCurrentPart,
      proposedPartBytes: 0,
    });

    const checksum = createHash("sha256");
    let sizeBytes = 0;
    const source = Readable.fromWeb(
      input.stream as NodeReadableStream<Uint8Array>
    );
    source.on("data", (chunk: Buffer) => {
      sizeBytes += chunk.byteLength;
      try {
        validateMultipartUsage({
          bytesWithoutCurrentPart: usage.bytesWithoutCurrentPart,
          maxPartBytes: input.maxBytes,
          maxPartCount: input.maxPartCount,
          maxTotalBytes: input.maxTotalBytes,
          partCountWithoutCurrentPart: usage.partCountWithoutCurrentPart,
          proposedPartBytes: sizeBytes,
        });
      } catch (error) {
        source.destroy(error instanceof Error ? error : new Error("Upload byte budget exceeded"));
        return;
      }
      checksum.update(chunk);
    });

    try {
      await pipeline(source, createWriteStream(partPath));
    } catch (error) {
      await rm(partPath, { force: true });
      throw error;
    }

    await saveUsageManifest({
      manifestPath: usage.manifestPath,
      partNumber: input.partNumber,
      parts: usage.parts,
      sizeBytes,
    });

    return {
      etag: checksum.digest("hex"),
      partNumber: toSafePartNumber(input.partNumber),
      sizeBytes,
    };
  });
}
