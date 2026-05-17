"use client";

import { useCallback, useState } from "react";
import type { BulkActionItem } from "@/components/files/explorer/workspace-bulk-operations-model";

interface UseExplorerFileDownloadsOptions {
  workspaceUuid: string;
}

function getDownloadFileName(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(
    /filename\*=UTF-8''([^;]+)(?:;|$)/i
  );
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const bareMatch = contentDisposition.match(/filename=([^;]+)/i);
  return bareMatch?.[1]?.trim() ?? null;
}

export function useExplorerFileDownloads({
  workspaceUuid,
}: UseExplorerFileDownloadsOptions) {
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  const downloadItemArchive = useCallback(
    async (item: { id: string; kind: "file" | "folder"; name: string }) => {
      if (!workspaceUuid || downloadStatus) {
        return;
      }

      setDownloadStatus(`Preparing ${item.name}`);
      try {
        const response = await fetch(
          `/api/workspaces/${workspaceUuid}/items/archive`,
          {
            body: JSON.stringify({
              id: item.id,
              kind: item.kind,
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          }
        );
        if (!response.ok) {
          return;
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download =
          getDownloadFileName(response.headers.get("content-disposition")) ??
          item.name;
        link.href = objectUrl;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
      } finally {
        setDownloadStatus(null);
      }
    },
    [downloadStatus, workspaceUuid]
  );

  const downloadSelectionArchive = useCallback(
    async (items: BulkActionItem[], fallbackName = "selection") => {
      if (!(workspaceUuid && items.length > 0) || downloadStatus) {
        return;
      }

      setDownloadStatus(`Preparing ${fallbackName}`);
      try {
        const response = await fetch(
          `/api/workspaces/${workspaceUuid}/items/archive`,
          {
            body: JSON.stringify({ items }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          }
        );
        if (!response.ok) {
          return;
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download =
          getDownloadFileName(response.headers.get("content-disposition")) ??
          `${fallbackName}.zip`;
        link.href = objectUrl;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
      } finally {
        setDownloadStatus(null);
      }
    },
    [downloadStatus, workspaceUuid]
  );

  return {
    downloadItemArchive,
    downloadSelectionArchive,
    downloadStatus,
  };
}
