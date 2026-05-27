import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import {
  getPartPath,
  getSessionDirectory,
  toSafePartNumber,
} from "@/lib/upload-multipart-paths";

export async function writeMultipartPart(input: {
  sessionId: string;
  partNumber: number;
  maxBytes: number;
  stream: ReadableStream<Uint8Array>;
}) {
  const dir = getSessionDirectory(input.sessionId);
  const partPath = getPartPath(input.sessionId, input.partNumber);
  await mkdir(dir, { recursive: true });

  const checksum = createHash("sha256");
  let sizeBytes = 0;
  const source = Readable.fromWeb(
    input.stream as NodeReadableStream<Uint8Array>
  );
  source.on("data", (chunk: Buffer) => {
    sizeBytes += chunk.byteLength;
    if (sizeBytes > input.maxBytes) {
      source.destroy(
        Object.assign(new Error("Part too large"), {
          code: "UPLOAD_PART_TOO_LARGE",
        })
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
}
