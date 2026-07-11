"use client";

export interface UploadPreflightInput {
  checksumSha256?: string;
  file: File;
  folderId: string;
  workspaceUuid: string;
}

interface UploadSessionPreflightResponse {
  session: { id: string };
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

export async function completeUploadSession(input: {
  checksumSha256?: string;
  file: File;
  metadata?: Record<string, unknown>;
  sessionId: string;
  uploaded: {
    contentType?: string;
    key?: string;
    size?: number;
    ufsUrl?: string;
  };
}) {
  const response = await fetch(`/api/uploads/sessions/${input.sessionId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storageKey: input.uploaded.key,
      storageUrl: input.uploaded.ufsUrl,
      mimeType: input.uploaded.contentType ?? input.file.type ?? null,
      sizeBytes: input.uploaded.size ?? input.file.size,
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
