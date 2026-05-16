import {
  getFileAssetById,
  getNoteContent,
  isMarkdownFileRecord,
  isTrustedStorageUrl,
} from "@/lib/file-data";
import { ensureWorkspaceAccessForUser } from "@/lib/workspace";
import {
  buildWorkspaceFileStreamResponseHeaders,
  resolveWorkspaceFileStreamForwardedRange,
} from "./workspace-file-stream-route-model";

export async function handleWorkspaceFileStreamGet(input: {
  fileUuid: string;
  request: Request;
  userId: string;
  workspaceUuid: string;
}) {
  const canAccess = await ensureWorkspaceAccessForUser(
    input.userId,
    input.workspaceUuid
  );
  if (!canAccess) {
    return new Response("Forbidden", { status: 403 });
  }

  const file = await getFileAssetById(input.workspaceUuid, input.fileUuid);
  if (!file?.storageUrl) {
    return new Response("File not found", { status: 404 });
  }

  if (isMarkdownFileRecord(file)) {
    const note = await getNoteContent(file.id);
    if (note?.content != null) {
      return new Response(note.content, {
        status: 200,
        headers: {
          "content-type": "text/markdown; charset=utf-8",
          "cache-control": "private, no-store, max-age=0",
        },
      });
    }
  }

  if (!isTrustedStorageUrl(file.storageUrl)) {
    return new Response("Invalid file source", { status: 400 });
  }

  const requestedRange = input.request.headers.get("range");
  const forwardedRange = resolveWorkspaceFileStreamForwardedRange({
    requestedRange,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
  });
  const upstreamHeaders = new Headers();
  if (forwardedRange) {
    upstreamHeaders.set("Range", forwardedRange);
  }

  const upstreamAbortController = new AbortController();
  const abortUpstream = () => upstreamAbortController.abort();
  if (input.request.signal.aborted) {
    abortUpstream();
  } else {
    input.request.signal.addEventListener("abort", abortUpstream, {
      once: true,
    });
  }

  const upstream = await fetch(file.storageUrl, {
    headers: upstreamHeaders,
    redirect: "follow",
    signal: upstreamAbortController.signal,
  }).catch(() => null);

  if (!upstream) {
    return new Response("Unable to stream file", { status: 502 });
  }
  if (!upstream.ok && upstream.status !== 206) {
    return new Response("Unable to stream file", { status: upstream.status });
  }

  const headers = buildWorkspaceFileStreamResponseHeaders({
    requestedRange,
    upstreamHeaders: upstream.headers,
    upstreamStatus: upstream.status,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
