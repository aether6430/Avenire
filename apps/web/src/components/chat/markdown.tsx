"use client";

import { memo } from "react";
import type { MarkdownProps } from "@/components/chat/markdown-model";
import { MemoizedMarkdownSurface } from "@/components/chat/markdown-surface";

export type { MarkdownProps } from "@/components/chat/markdown-model";

export const Markdown = memo(function Markdown({
  content,
  id,
  parseIncompleteMarkdown,
  className,
  textSize,
  workspaceUuid,
}: MarkdownProps) {
  return (
    <MemoizedMarkdownSurface
      className={className}
      content={content}
      key={id}
      parseIncompleteMarkdown={parseIncompleteMarkdown}
      textSize={textSize}
      workspaceUuid={workspaceUuid}
    />
  );
});
