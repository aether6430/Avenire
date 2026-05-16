"use client";

import type { PageMetadataState } from "@/lib/frontmatter";

export interface FilePreviewNoteLoadResponse {
  markdown?: string;
  updatedAt?: string | null;
  version?: number;
}

export interface FilePreviewNoteSyncResponse {
  hasConflict?: boolean;
  merged?: string;
  updatedAt?: string | null;
}

interface SaveFilePreviewNoteMetadataOptions {
  fileId: string;
  isMarkdown: boolean;
  page: PageMetadataState;
  workspaceUuid: string;
}

async function parseFilePreviewNoteError(
  response: Response,
  fallbackMessage: string
) {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  return payload.error ?? fallbackMessage;
}

export async function loadFilePreviewMarkdownNote(options: {
  fileId: string;
  signal?: AbortSignal;
}) {
  const { fileId, signal } = options;
  const response = await fetch(`/api/notes/${fileId}/sync`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error(
      await parseFilePreviewNoteError(
        response,
        `Unable to load note (${response.status})`
      )
    );
  }

  return (await response
    .json()
    .catch(() => ({}))) as FilePreviewNoteLoadResponse;
}

export async function syncFilePreviewMarkdownNote(options: {
  current: string;
  base: string;
  fileId: string;
}) {
  const { base, current, fileId } = options;
  const response = await fetch(`/api/notes/${fileId}/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base, current }),
  });
  if (!response.ok) {
    throw new Error(
      await parseFilePreviewNoteError(response, "Unable to sync note.")
    );
  }

  return (await response
    .json()
    .catch(() => ({}))) as FilePreviewNoteSyncResponse;
}

export async function saveFilePreviewNoteMetadata({
  fileId,
  isMarkdown,
  page,
  workspaceUuid,
}: SaveFilePreviewNoteMetadataOptions) {
  const endpoint = isMarkdown
    ? `/api/notes/${fileId}`
    : `/api/workspaces/${workspaceUuid}/files/${fileId}`;
  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page }),
  });

  return response.ok;
}
