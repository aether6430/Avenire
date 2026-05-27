import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { getSessionDirectory } from "@/lib/upload-multipart-paths";

async function listMultipartParts(sessionId: string) {
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
        if (!info?.isFile()) {
          return null;
        }
        return {
          ...part,
          sizeBytes: info.size,
        };
      })
  );

  return parts.filter((part): part is NonNullable<typeof part> =>
    Boolean(part)
  );
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
