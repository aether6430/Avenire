"use client";

import { Separator } from "@avenire/ui/components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avenire/ui/components/table";
import { memo, useMemo } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { CodeRenderer } from "@/components/chat/markdown-code";
import {
  areMarkdownRenderPropsEqual,
  getMarkdownSizeClasses,
  type MarkdownRenderProps,
  normalizeMarkdownContent,
} from "@/components/chat/markdown-model";
import { WorkspaceFileLink } from "@/components/chat/markdown-workspace-link";
import { cn } from "@/lib/utils";

import "katex/dist/katex.min.css";

export const ChatMarkdownSurface = memo(
  ({
    content,
    parseIncompleteMarkdown = true,
    className,
    textSize = "default",
    workspaceUuid,
  }: MarkdownRenderProps) => {
    const normalized = useMemo(
      () =>
        normalizeMarkdownContent({
          content,
          parseIncompleteMarkdown,
        }),
      [content, parseIncompleteMarkdown]
    );
    const sizeClasses = getMarkdownSizeClasses(textSize);

    return (
      <div
        className={cn(
          "prose prose-sm dark:prose-invert prose-blockquote:my-2 prose-hr:my-3 prose-ol:my-2 prose-p:my-2 prose-pre:my-3 prose-ul:my-2 max-w-full break-words",
          sizeClasses.body,
          className
        )}
      >
        <ReactMarkdown
          components={{
            code: CodeRenderer,
            ol: ({ children, className, ...props }: any) => (
              <ol
                className={cn("ml-4 list-outside list-decimal", className)}
                {...(props as React.OlHTMLAttributes<HTMLOListElement>)}
              >
                {children}
              </ol>
            ),
            li: ({ children, className, ...props }: any) => (
              <li
                className={cn("py-1", className)}
                {...(props as React.LiHTMLAttributes<HTMLLIElement>)}
              >
                {children}
              </li>
            ),
            ul: ({ children, className, ...props }: any) => (
              <ul
                className={cn("ml-4 list-outside list-disc", className)}
                {...(props as React.HTMLAttributes<HTMLUListElement>)}
              >
                {children}
              </ul>
            ),
            table: ({ children, className, ...props }: any) => (
              <Table
                className={className}
                {...(props as React.HTMLAttributes<HTMLTableElement>)}
              >
                {children}
              </Table>
            ),
            thead: ({ children, className, ...props }: any) => (
              <TableHeader
                className={className}
                {...(props as React.HTMLAttributes<HTMLTableSectionElement>)}
              >
                {children}
              </TableHeader>
            ),
            tr: ({ children, className, ...props }: any) => (
              <TableRow
                className={className}
                {...(props as React.HTMLAttributes<HTMLTableRowElement>)}
              >
                {children}
              </TableRow>
            ),
            th: ({ children, className, ...props }: any) => (
              <TableHead
                className={cn("text-left", className)}
                {...(props as React.HTMLAttributes<HTMLTableCellElement>)}
              >
                {children}
              </TableHead>
            ),
            tbody: ({ children, className, ...props }: any) => (
              <TableBody
                className={className}
                {...(props as React.HTMLAttributes<HTMLTableSectionElement>)}
              >
                {children}
              </TableBody>
            ),
            td: ({ children, className, ...props }: any) => (
              <TableCell
                className={className}
                {...(props as React.HTMLAttributes<HTMLTableCellElement>)}
              >
                {children}
              </TableCell>
            ),
            hr: ({ className }: any) => <Separator className={className} />,
            strong: ({ children, className, ...props }: any) => (
              <strong
                className={cn("font-semibold", className)}
                {...(props as React.HTMLAttributes<HTMLElement>)}
              >
                {children}
              </strong>
            ),
            a: ({ children, className, ...props }: any) => {
              const href =
                typeof props.href === "string" ? props.href.trim() : "";
              const isWorkspaceFileLink = href.startsWith("workspace-file://");

              if (isWorkspaceFileLink) {
                return (
                  <WorkspaceFileLink
                    className={className}
                    href={href}
                    workspaceUuid={workspaceUuid}
                    {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
                  >
                    {children}
                  </WorkspaceFileLink>
                );
              }

              return (
                <a
                  className={cn(
                    "font-medium text-primary underline underline-offset-2",
                    className
                  )}
                  rel="noreferrer"
                  target="_blank"
                  {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
                >
                  {children}
                </a>
              );
            },
            h1: ({ children, className, ...props }: any) => (
              <h1
                className={cn(sizeClasses.h1, className)}
                {...(props as React.HTMLAttributes<HTMLHeadingElement>)}
              >
                {children}
              </h1>
            ),
            h2: ({ children, className, ...props }: any) => (
              <h2
                className={cn(sizeClasses.h2, className)}
                {...(props as React.HTMLAttributes<HTMLHeadingElement>)}
              >
                {children}
              </h2>
            ),
            h3: ({ children, className, ...props }: any) => (
              <h3
                className={cn(sizeClasses.h3, className)}
                {...(props as React.HTMLAttributes<HTMLHeadingElement>)}
              >
                {children}
              </h3>
            ),
            h4: ({ children, className, ...props }: any) => (
              <h4
                className={cn(sizeClasses.h4, className)}
                {...(props as React.HTMLAttributes<HTMLHeadingElement>)}
              >
                {children}
              </h4>
            ),
            h5: ({ children, className, ...props }: any) => (
              <h5
                className={cn(sizeClasses.h5, className)}
                {...(props as React.HTMLAttributes<HTMLHeadingElement>)}
              >
                {children}
              </h5>
            ),
            h6: ({ children, className, ...props }: any) => (
              <h6
                className={cn(sizeClasses.h6, className)}
                {...(props as React.HTMLAttributes<HTMLHeadingElement>)}
              >
                {children}
              </h6>
            ),
          }}
          rehypePlugins={[rehypeKatex]}
          remarkPlugins={[remarkGfm, remarkMath]}
          urlTransform={(url) => {
            if (url.startsWith("workspace-file://")) {
              return url;
            }
            return defaultUrlTransform(url);
          }}
        >
          {normalized}
        </ReactMarkdown>
      </div>
    );
  },
  areMarkdownRenderPropsEqual
);

ChatMarkdownSurface.displayName = "ChatMarkdownSurface";
