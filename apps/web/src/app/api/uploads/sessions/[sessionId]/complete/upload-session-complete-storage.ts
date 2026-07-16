import { openAsBlob } from "node:fs";
import { open, writeFile } from "node:fs/promises";
import { deleteStorageFiles, uploadStorageFile } from "@avenire/storage";
import {
  fileMagicBytesMatchMimeType,
  normalizeFileMimeType,
} from "@avenire/ingestion/file-contract";
import { assembleMultipartPartsToFile } from "@/lib/upload-multipart-assembly";
import { getProviderObjectMarkerPath } from "@/lib/upload-multipart-paths";

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

  const mimeType = normalizeFileMimeType(input.mimeType);
  if (!mimeType) {
    throw Object.assign(new Error("Unsupported upload MIME type"), {
      code: "UPLOAD_MIME_UNSUPPORTED",
    });
  }
  const file = await open(assembled.path, "r");
  const prefix = Buffer.alloc(Math.min(8192, assembled.totalSizeBytes));
  try {
    await file.read(prefix, 0, prefix.byteLength, 0);
  } finally {
    await file.close();
  }
  if (!fileMagicBytesMatchMimeType({ bytes: prefix, mimeType })) {
    throw Object.assign(new Error("Uploaded content does not match its MIME type"), {
      code: "UPLOAD_MIME_MISMATCH",
    });
  }

  const assembledBlob = await openAsBlob(assembled.path, {
    type: mimeType,
  });
  const uploaded = await uploadStorageFile({
    body: assembledBlob,
    contentType: mimeType,
    name: input.name,
  });

  if (typeof uploaded.key !== "string" || typeof uploaded.url !== "string") {
    throw new Error(
      "Multipart upload assembly succeeded but UploadThing upload failed."
    );
  }
  await writeFile(getProviderObjectMarkerPath(input.sessionId), uploaded.key, {
    encoding: "utf8",
    mode: 0o600,
  });

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
