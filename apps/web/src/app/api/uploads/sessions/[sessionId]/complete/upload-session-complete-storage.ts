import { openAsBlob } from "node:fs";
import { deleteStorageFiles, uploadStorageFile } from "@avenire/storage";
import { assembleMultipartPartsToFile } from "@/lib/upload-multipart-assembly";

export async function completeMultipartUploadSession(input: {
  expectedPartNumbers?: number[];
  mimeType: string | null;
  name: string;
  sessionId: string;
}) {
  if (!process.env.UPLOADTHING_TOKEN) {
    throw Object.assign(new Error("UPLOADTHING_TOKEN missing"), {
      code: "UPLOADTHING_UNAVAILABLE",
    });
  }

  const assembled = await assembleMultipartPartsToFile(input.sessionId);
  if (
    Array.isArray(input.expectedPartNumbers) &&
    input.expectedPartNumbers.length > 0
  ) {
    const normalizedExpected = [
      ...new Set(
        input.expectedPartNumbers.map((value) => Math.max(1, Math.trunc(value)))
      ),
    ].sort((a, b) => a - b);
    const normalizedActual = [...assembled.partNumbers].sort((a, b) => a - b);
    if (
      JSON.stringify(normalizedExpected) !== JSON.stringify(normalizedActual)
    ) {
      throw Object.assign(new Error("Multipart part list mismatch"), {
        code: "MULTIPART_PART_MISMATCH",
      });
    }
  }

  const assembledBlob = await openAsBlob(assembled.path, {
    type: input.mimeType ?? undefined,
  });
  const uploaded = await uploadStorageFile({
    body: assembledBlob,
    contentType: input.mimeType,
    name: input.name,
  });

  if (typeof uploaded.key !== "string" || typeof uploaded.url !== "string") {
    throw new Error(
      "Multipart upload assembly succeeded but UploadThing upload failed."
    );
  }

  return {
    checksumSha256: assembled.checksumSha256,
    partCount: assembled.partCount,
    partNumbers: assembled.partNumbers,
    sizeBytes: assembled.totalSizeBytes,
    storageKey: uploaded.key,
    storageUrl: uploaded.url,
  };
}

export async function cleanupUploadedStorageObject(storageKey: string | null) {
  if (!(storageKey && process.env.UPLOADTHING_TOKEN)) {
    return;
  }

  await deleteStorageFiles([storageKey]);
}
