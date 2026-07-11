import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
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
  readonly code: "UPLOAD_PART_TOO_LARGE" | "UPLOAD_TOTAL_TOO_LARGE" | "UPLOAD_TOO_MANY_PARTS";

  constructor(
    code: MultipartUploadLimitError["code"],
    message: string
  ) {
    super(message);
    this.name = "MultipartUploadLimitError";
    this.code = code;
  }
}

const sessionWrites = new Map<string, Promise<void>>();

async function withSessionWriteLock<A>(sessionId: string, run: () => Promise<A>) {
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
}) {
  const names = await readdir(input.dir).catch(() => [] as string[]);
  const partPaths = names
    .filter((name) => /^\d+\.part$/.test(name))
    .map((name) => join(input.dir, name));
  const sizes = await Promise.all(
    partPaths.map(async (path) => (await stat(path).catch(() => null))?.size ?? 0)
  );
  const existingPart = await stat(input.partPath).catch(() => null);
  return {
    bytesWithoutCurrentPart:
      sizes.reduce((total, size) => total + size, 0) - (existingPart?.size ?? 0),
    partCountWithoutCurrentPart:
      partPaths.length - (existingPart?.isFile() ? 1 : 0),
  };
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
    const usage = await getExistingMultipartUsage({ dir, partPath });
    if (usage.partCountWithoutCurrentPart + 1 > input.maxPartCount) {
      throw new MultipartUploadLimitError(
        "UPLOAD_TOO_MANY_PARTS",
        "Upload has too many parts"
      );
    }

    const checksum = createHash("sha256");
    let sizeBytes = 0;
    const source = Readable.fromWeb(
      input.stream as NodeReadableStream<Uint8Array>
    );
    source.on("data", (chunk: Buffer) => {
      sizeBytes += chunk.byteLength;
      const code =
        sizeBytes > input.maxBytes
          ? "UPLOAD_PART_TOO_LARGE"
          : usage.bytesWithoutCurrentPart + sizeBytes > input.maxTotalBytes
            ? "UPLOAD_TOTAL_TOO_LARGE"
            : null;
      if (code) {
        source.destroy(
          new MultipartUploadLimitError(code, "Upload byte budget exceeded")
        );
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

    return {
      etag: checksum.digest("hex"),
      partNumber: toSafePartNumber(input.partNumber),
      sizeBytes,
    };
  });
}
