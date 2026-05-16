import remend from "remend";
import type { BundledLanguage } from "shiki";
import { bundledLanguages, bundledLanguagesAlias } from "shiki";

const CODE_LANGUAGE_REGEX = /language-([^\s]+)/;
const WORKSPACE_FILE_PROTOCOL_REGEX = /^workspace-file:\/\/(.+)$/;
const WORKSPACE_FILE_LINK_REGEX =
  /\[([^\]]+)\]\((workspace-file:\/\/[^)\s][^)]*?)\)/g;

export interface MarkdownProps {
  className?: string;
  content: string;
  id: string;
  parseIncompleteMarkdown?: boolean;
  textSize?: "default" | "small";
  workspaceUuid?: string;
}

export type MarkdownRenderProps = Omit<MarkdownProps, "id">;

export function extractCodeLanguage(className?: string) {
  const match = className?.match(CODE_LANGUAGE_REGEX);
  return (match?.[1] ?? "").toLowerCase();
}

export function resolveBundledLanguage(
  language: string
): BundledLanguage | null {
  if (!language) {
    return null;
  }

  if (Object.hasOwn(bundledLanguages, language)) {
    return language as BundledLanguage;
  }

  const alias =
    bundledLanguagesAlias[language as keyof typeof bundledLanguagesAlias];
  if (typeof alias === "string") {
    return alias;
  }

  return null;
}

export function buildHighlightCacheKey(
  code: string,
  language: BundledLanguage
) {
  return `${language}:${code}`;
}

export function normalizeWorkspaceFileLinks(content: string) {
  return content.replace(WORKSPACE_FILE_LINK_REGEX, (_match, label, rawUrl) => {
    const normalizedUrl = rawUrl.replace(
      WORKSPACE_FILE_PROTOCOL_REGEX,
      (_prefixMatch, rawPath) => `workspace-file://${encodeURI(rawPath)}`
    );
    return `[${label}](${normalizedUrl})`;
  });
}

export function normalizeMathDelimiters(content: string) {
  return content
    .replace(/\[\/math\]([\s\S]*?)\[\/math\]/g, (_match, mathContent) => {
      return `$$${String(mathContent).trim()}$$`;
    })
    .replace(/\[\/inline\]([\s\S]*?)\[\/inline\]/g, (_match, mathContent) => {
      return `$${String(mathContent).trim()}$`;
    })
    .replace(/\\{1,2}\(([\s\S]*?)\\{1,2}\)/g, (_match, mathContent) => {
      return `$${String(mathContent).trim()}$`;
    })
    .replace(/\\{1,2}\[([\s\S]*?)\\{1,2}\]/g, (_match, mathContent) => {
      return `$$${String(mathContent).trim()}$$`;
    });
}

export function normalizeMarkdownContent({
  content,
  parseIncompleteMarkdown = true,
}: {
  content: string;
  parseIncompleteMarkdown?: boolean;
}) {
  const contentWithWorkspaceLinks = normalizeWorkspaceFileLinks(content);
  const contentWithNormalizedMath = normalizeMathDelimiters(
    contentWithWorkspaceLinks
  );

  return parseIncompleteMarkdown &&
    !contentWithNormalizedMath.includes("workspace-file://")
    ? remend(contentWithNormalizedMath)
    : contentWithNormalizedMath;
}

export function getMarkdownSizeClasses(
  textSize: MarkdownRenderProps["textSize"] = "default"
) {
  return textSize === "small"
    ? {
        body: "[&_p]:text-xs [&_li]:text-xs [&_p]:leading-relaxed",
        h1: "mt-4 mb-2 font-semibold text-xl",
        h2: "mt-4 mb-2 font-semibold text-lg",
        h3: "mt-4 mb-2 font-semibold text-base",
        h4: "mt-3 mb-1.5 font-semibold text-sm",
        h5: "mt-3 mb-1.5 font-semibold text-sm",
        h6: "mt-3 mb-1.5 font-semibold text-xs",
      }
    : {
        body: "",
        h1: "mt-6 mb-2 font-semibold text-3xl",
        h2: "mt-6 mb-2 font-semibold text-2xl",
        h3: "mt-6 mb-2 font-semibold text-xl",
        h4: "mt-6 mb-2 font-semibold text-lg",
        h5: "mt-6 mb-2 font-semibold text-base",
        h6: "mt-6 mb-2 font-semibold text-sm",
      };
}

export function areMarkdownRenderPropsEqual(
  prev: MarkdownRenderProps,
  next: MarkdownRenderProps
) {
  return (
    prev.content === next.content &&
    prev.parseIncompleteMarkdown === next.parseIncompleteMarkdown &&
    prev.className === next.className &&
    prev.textSize === next.textSize &&
    prev.workspaceUuid === next.workspaceUuid
  );
}
