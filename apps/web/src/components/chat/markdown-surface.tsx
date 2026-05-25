"use client";

import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import {
  areMarkdownRenderPropsEqual,
  getMarkdownSizeClasses,
  type MarkdownRenderProps,
  normalizeMarkdownContent,
} from "@/components/chat/markdown-model";
import {
  createMarkdownComponents,
  transformMarkdownUrl,
} from "@/components/chat/markdown-renderers";
import { cn } from "@/lib/utils";

import "katex/dist/katex.min.css";

export const MemoizedMarkdownSurface = memo(
  ({
    content,
    parseIncompleteMarkdown = true,
    className,
    textSize = "default",
    workspaceUuid,
  }: MarkdownRenderProps) => {
    const normalized = useMemo(
      () => normalizeMarkdownContent({ content, parseIncompleteMarkdown }),
      [content, parseIncompleteMarkdown]
    );
    const sizeClasses = getMarkdownSizeClasses(textSize);
    const components = useMemo(
      () => createMarkdownComponents({ sizeClasses, workspaceUuid }),
      [sizeClasses, workspaceUuid]
    );

    return (
      <div
        className={cn(
          "prose prose-sm dark:prose-invert prose-blockquote:my-2 prose-hr:my-3 prose-ol:my-2 prose-p:my-2 prose-pre:my-3 prose-ul:my-2 max-w-full break-words",
          sizeClasses.body,
          className
        )}
      >
        <ReactMarkdown
          components={components}
          rehypePlugins={[rehypeKatex]}
          remarkPlugins={[remarkGfm, remarkMath]}
          urlTransform={transformMarkdownUrl}
        >
          {normalized}
        </ReactMarkdown>
      </div>
    );
  },
  areMarkdownRenderPropsEqual
);

MemoizedMarkdownSurface.displayName = "MemoizedMarkdownSurface";
