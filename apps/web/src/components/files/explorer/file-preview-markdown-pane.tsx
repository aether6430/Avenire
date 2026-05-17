"use client";

import {
  type FilePreviewMarkdownPaneProps,
  FilePreviewMarkdownPaneSurface,
} from "@/components/files/explorer/file-preview-markdown-pane-surface";

export function FilePreviewMarkdownPane(props: FilePreviewMarkdownPaneProps) {
  return <FilePreviewMarkdownPaneSurface {...props} />;
}
