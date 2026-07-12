"use client";

export interface UploadPreflightInput {
  checksumSha256?: string;
  file: File;
  folderId: string;
  workspaceUuid: string;
}

interface UploadSessionPreflightResponse {
  session: { id: string };
  multipart: { recommendedPartSizeBytes: number };
}

export async function requestUploadPreflight(input: UploadPreflightInput) {
  const response = await fetch("/api/uploads/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspaceUuid: input.workspaceUuid,
      folderId: input.folderId,
      name: input.file.name,
      mimeType: input.file.type || null,
      sizeBytes: input.file.size,
      checksumSha256: input.checksumSha256,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(payload.error ?? "Unable to prepare upload.");
  }

  const payload = (await response.json()) as UploadSessionPreflightResponse;
  if (!payload.session?.id) {
    throw new Error("Upload preparation returned no session.");
  }
  return payload;
}

export async function uploadFileWithSession(input: {
  checksumSha256?: string;
  file: File;
  folderId: string;
  metadata?: Record<string, unknown>;
  workspaceUuid: string;
}) {
  const preflight = await requestUploadPreflight({
    checksumSha256: input.checksumSha256,
    file: input.file,
    folderId: input.folderId,
    workspaceUuid: input.workspaceUuid,
  });
  const partSize = Math.max(1, preflight.multipart.recommendedPartSizeBytes);
  const partNumbers = Array.from(
    { length: Math.max(1, Math.ceil(input.file.size / partSize)) },
    (_, index) => index + 1
  );
  const partsResponse = await fetch(
    `/api/uploads/sessions/${preflight.session.id}/parts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partNumbers }),
    }
  );
  const partsPayload = await partsResponse.json().catch(() => ({}));
  if (!partsResponse.ok || !Array.isArray(partsPayload.parts)) {
    throw new Error(
      typeof partsPayload.error === "string"
        ? partsPayload.error
        : "Unable to prepare upload parts."
    );
  }
  for (const part of partsPayload.parts) {
    if (
      typeof part !== "object" ||
      part === null ||
      typeof part.partNumber !== "number" ||
      typeof part.uploadUrl !== "string"
    ) {
      throw new Error("Upload preparation returned an invalid part.");
    }
    const start = (part.partNumber - 1) * partSize;
    const uploadResponse = await fetch(part.uploadUrl, {
      method: "PUT",
      body: input.file.slice(start, Math.min(start + partSize, input.file.size)),
    });
    if (!uploadResponse.ok) {
      const error = await uploadResponse.json().catch(() => ({}));
      throw new Error(
        typeof error.error === "string" ? error.error : "Unable to upload file part."
      );
    }
  }

  const response = await fetch(`/api/uploads/sessions/${preflight.session.id}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      multipart: { partNumbers },
      checksumSha256: input.checksumSha256,
      metadata: input.metadata,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Unable to complete upload.";
    throw new Error(message);
  }
  return payload;
}
