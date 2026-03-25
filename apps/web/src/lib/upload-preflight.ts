"use client";

export interface UploadPreflightInput {
  checksumSha256?: string;
  file: File;
  folderId: string;
  workspaceUuid: string;
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

  return response.json();
}
