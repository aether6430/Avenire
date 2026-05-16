"use client";

import { Button } from "@avenire/ui/components/button";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { bundledLanguages, codeToHtml } from "shiki";
import {
  buildHighlightCacheKey,
  extractCodeLanguage,
  resolveBundledLanguage,
} from "@/components/chat/markdown-model";
import { MermaidDiagram } from "@/components/chat/mermaid";
import { cn } from "@/lib/utils";

const TRAILING_NEWLINE_REGEX = /\n$/;
const CODE_THEME_LIGHT = "github-light-default";
const CODE_THEME_DARK = "github-dark-default";
const highlightedCodeCache = new Map<string, string>();

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

export function CodeRenderer({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"code">) {
  const raw = String(children ?? "");
  const code = raw.replace(TRAILING_NEWLINE_REGEX, "");
  const language = extractCodeLanguage(className);
  const isBlock =
    language.length > 0 &&
    (Object.hasOwn(bundledLanguages, language) ||
      resolveBundledLanguage(language) !== null ||
      language === "mermaid");

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
