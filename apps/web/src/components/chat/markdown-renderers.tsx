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
import { defaultUrlTransform } from "react-markdown";
import { CodeRenderer } from "@/components/chat/markdown-code";
import type { MarkdownRenderProps } from "@/components/chat/markdown-model";
import { WorkspaceFileLink } from "@/components/chat/markdown-workspace-link";
import { cn } from "@/lib/utils";

export function createMarkdownComponents({
  sizeClasses,
  workspaceUuid,
}: {
  sizeClasses: ReturnType<
    typeof import("./markdown-model").getMarkdownSizeClasses
  >;
  workspaceUuid?: MarkdownRenderProps["workspaceUuid"];
}) {
  return {
    a: ({ children, className, ...props }: any) => {
      const href = typeof props.href === "string" ? props.href.trim() : "";
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
    code: CodeRenderer,
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
    hr: ({ className }: any) => <Separator className={className} />,
    li: ({ children, className, ...props }: any) => (
      <li
        className={cn("py-1", className)}
        {...(props as React.LiHTMLAttributes<HTMLLIElement>)}
      >
        {children}
      </li>
    ),
    ol: ({ children, className, ...props }: any) => (
      <ol
        className={cn("ml-4 list-outside list-decimal", className)}
        {...(props as React.OlHTMLAttributes<HTMLOListElement>)}
      >
        {children}
      </ol>
    ),
    strong: ({ children, className, ...props }: any) => (
      <strong
        className={cn("font-semibold", className)}
        {...(props as React.HTMLAttributes<HTMLElement>)}
      >
        {children}
      </strong>
    ),
    table: ({ children, className, ...props }: any) => (
      <Table
        className={className}
        {...(props as React.HTMLAttributes<HTMLTableElement>)}
      >
        {children}
      </Table>
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
    th: ({ children, className, ...props }: any) => (
      <TableHead
        className={cn("text-left", className)}
        {...(props as React.HTMLAttributes<HTMLTableCellElement>)}
      >
        {children}
      </TableHead>
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
    ul: ({ children, className, ...props }: any) => (
      <ul
        className={cn("ml-4 list-outside list-disc", className)}
        {...(props as React.HTMLAttributes<HTMLUListElement>)}
      >
        {children}
      </ul>
    ),
  };
}

export function transformMarkdownUrl(url: string) {
  if (url.startsWith("workspace-file://")) {
    return url;
  }
  return defaultUrlTransform(url);
}
