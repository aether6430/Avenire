"use client";

import { FilePreviewPanelSurface } from "./file-preview-panel-surface";
import type { FilePreviewPanelProps } from "./file-preview-panel-types";
import { useFilePreviewPanel } from "./use-file-preview-panel";

export type { FilePreviewPanelProps } from "./file-preview-panel-types";

export function FilePreviewPanel(props: FilePreviewPanelProps) {
  const runtime = useFilePreviewPanel(props);

  return <FilePreviewPanelSurface runtime={runtime} />;
}
