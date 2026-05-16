import { openAsBlob } from "node:fs";
import { UTApi, UTFile } from "@avenire/storage";
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

  const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });
  const assembledBlob = await openAsBlob(assembled.path, {
    type: input.mimeType ?? undefined,
  });
  const uploadResult = await utapi.uploadFiles(
    new UTFile([assembledBlob], input.name, {
      type: input.mimeType ?? undefined,
    })
  );
  const result = Array.isArray(uploadResult) ? uploadResult[0] : uploadResult;
  const uploaded = result?.data;

  if (
    !uploaded ||
    typeof uploaded.key !== "string" ||
    typeof uploaded.ufsUrl !== "string"
  ) {
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
    storageUrl: uploaded.ufsUrl,
  };
}

export async function cleanupUploadedStorageObject(storageKey: string | null) {
  if (!(storageKey && process.env.UPLOADTHING_TOKEN)) {
    return;
  }

  const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });
  await utapi.deleteFiles([storageKey]);
}
