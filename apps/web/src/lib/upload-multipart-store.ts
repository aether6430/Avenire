import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

const ROOT_DIR =
  process.env.UPLOAD_SESSION_PARTS_DIR ??
  join(tmpdir(), "avenire-upload-session-parts");

function toSafeSessionSegment(sessionId: string) {
  return sessionId.replace(/[^a-zA-Z0-9-_]/g, "_");
}

function toSafePartNumber(partNumber: number) {
  return Math.max(1, Math.trunc(partNumber));
}

function getSessionDirectory(sessionId: string) {
  return join(ROOT_DIR, toSafeSessionSegment(sessionId));
}

function getPartPath(sessionId: string, partNumber: number) {
  const safePartNumber = toSafePartNumber(partNumber);
  return join(getSessionDirectory(sessionId), `${safePartNumber}.part`);
}

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

export async function listMultipartParts(sessionId: string) {
  const dir = getSessionDirectory(sessionId);
  const names = await readdir(dir).catch(() => [] as string[]);
  const parts = await Promise.all(
    names
      .map((name) => {
        const match = /^(\d+)\.part$/.exec(name);
        if (!match?.[1]) {
          return null;
        }
        return {
          fileName: name,
          partNumber: Number.parseInt(match[1], 10),
          path: join(dir, name),
        };
      })
      .filter((part): part is NonNullable<typeof part> => Boolean(part))
      .sort((a, b) => a.partNumber - b.partNumber)
      .map(async (part) => {
        const info = await stat(part.path).catch(() => null);
        if (!info || !info.isFile()) {
          return null;
        }
        return {
          ...part,
          sizeBytes: info.size,
        };
      })
  );

  return parts.filter((part): part is NonNullable<typeof part> => Boolean(part));
}

export async function assembleMultipartPartsToFile(sessionId: string) {
  const parts = await listMultipartParts(sessionId);
  if (parts.length === 0) {
    throw new Error("No uploaded multipart parts found.");
  }

  const dir = getSessionDirectory(sessionId);
  const assembledPath = join(dir, "assembled.upload");
  const checksum = createHash("sha256");
  let totalSizeBytes = 0;
  const destination = createWriteStream(assembledPath);

  try {
    for (const part of parts) {
      await pipeline(
        createReadStream(part.path).on("data", (chunk: Buffer) => {
          totalSizeBytes += chunk.byteLength;
          checksum.update(chunk);
        }),
        destination,
        { end: false }
      );
    }
  } catch (error) {
    destination.destroy();
    await rm(assembledPath, { force: true });
    throw error;
  }

  await new Promise<void>((resolve, reject) => {
    destination.end((error?: Error | null) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  return {
    checksumSha256: checksum.digest("hex"),
    path: assembledPath,
    partNumbers: parts.map((part) => part.partNumber),
    partCount: parts.length,
    totalSizeBytes,
  };
}

export async function clearMultipartParts(sessionId: string) {
  await rm(getSessionDirectory(sessionId), { recursive: true, force: true });
}
