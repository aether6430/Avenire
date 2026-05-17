"use client";

import { Button } from "@avenire/ui/components/button";
import { Separator } from "@avenire/ui/components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avenire/ui/components/table";
import {
  CheckIcon,
  Copy as CopyIcon,
  FileText as FileTextIcon,
} from "@phosphor-icons/react";
import type { Route } from "next";
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { defaultUrlTransform } from "react-markdown";
import { codeToHtml } from "shiki";
import {
  buildHighlightCacheKey,
  extractCodeLanguage,
  type MarkdownRenderProps,
  resolveBundledLanguage,
} from "@/components/chat/markdown-model";
import { MermaidDiagram } from "@/components/chat/mermaid";
import { cn } from "@/lib/utils";
import { resolveWorkspaceFileRoute } from "@/lib/workspace-file-navigation";

const TRAILING_NEWLINE_REGEX = /\n$/;
const CODE_THEME_LIGHT = "github-light-default";
const CODE_THEME_DARK = "github-dark-default";
const highlightedCodeCache = new Map<string, string>();
const workspaceRouteCache = new Map<string, Route | null>();

function WorkspaceFileLink({
  children,
  className,
  href,
  onClick,
  workspaceUuid,
  ...props
}: ComponentPropsWithoutRef<"a"> & {
  workspaceUuid?: string;
}) {
  const normalizedHref = typeof href === "string" ? href.trim() : "";
  const fileIdentifier = normalizedHref.startsWith("workspace-file://")
    ? decodeURIComponent(normalizedHref.replace("workspace-file://", "").trim())
    : "";
  const cacheKey =
    workspaceUuid && fileIdentifier
      ? `${workspaceUuid}:${fileIdentifier}`
      : undefined;
  const [resolvedRoute, setResolvedRoute] = useState<Route | null>(() =>
    cacheKey ? (workspaceRouteCache.get(cacheKey) ?? null) : null
  );

  useEffect(() => {
    let cancelled = false;

    if (!(workspaceUuid && fileIdentifier && cacheKey)) {
      setResolvedRoute(null);
      return;
    }

    const cachedRoute = workspaceRouteCache.get(cacheKey);
    if (cachedRoute !== undefined) {
      setResolvedRoute(cachedRoute);
      return;
    }

    resolveWorkspaceFileRoute(workspaceUuid, fileIdentifier)
      .then((route) => {
        if (!cancelled) {
          workspaceRouteCache.set(cacheKey, route);
          setResolvedRoute(route);
        }
      })
      .catch(() => {
        if (!cancelled) {
          workspaceRouteCache.set(cacheKey, null);
          setResolvedRoute(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, fileIdentifier, workspaceUuid]);

  return (
    <a
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/60 px-2.5 py-1 font-medium font-mono text-[11px] text-foreground no-underline hover:bg-muted",
        !resolvedRoute && "cursor-default opacity-80",
        className
      )}
      {...props}
      href={resolvedRoute ?? "#"}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        if (!resolvedRoute) {
          event.preventDefault();
          if (!(workspaceUuid && fileIdentifier && cacheKey)) {
            return;
          }
          resolveWorkspaceFileRoute(workspaceUuid, fileIdentifier)
            .then((route) => {
              workspaceRouteCache.set(cacheKey, route);
              setResolvedRoute(route);
              if (route) {
                window.location.assign(route);
              }
            })
            .catch(() => undefined);
        }
      }}
      rel="noreferrer"
      target="_self"
    >
      <FileTextIcon className="size-3.5 text-primary" />
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
        Source
      </span>
      <span>{children}</span>
    </a>
  );
}

function MarkdownCodeBlock({
  children,
  code,
}: {
  children: ReactNode;
  code: string;
}) {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="chat-markdown-codeblock">
      <Button
        aria-label={copied ? "Copied" : "Copy code"}
        className="chat-markdown-copy-button"
        onClick={() => {
          if (!navigator?.clipboard) {
            return;
          }

          navigator.clipboard.writeText(code).then(
            () => {
              if (copiedTimerRef.current) {
                clearTimeout(copiedTimerRef.current);
              }
              setCopied(true);
              copiedTimerRef.current = setTimeout(() => {
                setCopied(false);
                copiedTimerRef.current = null;
              }, 1200);
            },
            () => undefined
          );
        }}
        title={copied ? "Copied" : "Copy code"}
        type="button"
        variant="ghost"
      >
        {copied ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </Button>
      {children}
    </div>
  );
}

function HighlightedCodeBlock({
  className,
  code,
}: {
  className?: string;
  code: string;
}) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const language = extractCodeLanguage(className);
  const bundledLanguage = resolveBundledLanguage(language);

  useEffect(() => {
    let cancelled = false;

    if (!bundledLanguage) {
      setHighlightedHtml(null);
      return;
    }

    const cacheKey = buildHighlightCacheKey(code, bundledLanguage);
    const cached = highlightedCodeCache.get(cacheKey);
    if (cached) {
      setHighlightedHtml(cached);
      return;
    }

    codeToHtml(code, {
      lang: bundledLanguage,
      themes: {
        dark: CODE_THEME_DARK,
        light: CODE_THEME_LIGHT,
      },
    })
      .then((html) => {
        if (cancelled) {
          return;
        }
        highlightedCodeCache.set(cacheKey, html);
        setHighlightedHtml(html);
      })
      .catch(() => {
        if (!cancelled) {
          setHighlightedHtml(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bundledLanguage, code]);

  return (
    <MarkdownCodeBlock code={code}>
      {highlightedHtml ? (
        <div
          className="chat-markdown-shiki"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <pre className="my-0 overflow-x-auto px-4 py-4">
          <code className={cn("whitespace-pre font-mono text-xs", className)}>
            {code}
          </code>
        </pre>
      )}
    </MarkdownCodeBlock>
  );
}

function CodeRenderer({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"code">) {
  const raw = String(children ?? "");
  const code = raw.replace(TRAILING_NEWLINE_REGEX, "");
  const language = extractCodeLanguage(className);
  const isBlock = language.length > 0;

  if (isBlock && language === "mermaid") {
    return (
      <MermaidDiagram chart={code} containerHeight={420} containerWidth={920} />
    );
  }

  if (isBlock) {
    return <HighlightedCodeBlock className={className} code={code} />;
  }

  return (
    <code
      className={cn(
        "rounded bg-muted px-1 py-0.5 font-mono text-xs",
        className
      )}
      {...props}
    >
      {children}
    </code>
  );
}

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
