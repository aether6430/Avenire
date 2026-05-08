import { parse, stringify } from "yaml";

const FRONTMATTER_RE = /^---\n([\s\S]*?\n)?---(?:\n|$)/;

export interface ParsedMarkdown {
  body: string;
  frontmatter: string | null;
}

export interface FrontmatterEntry {
  isComplex: boolean;
  key: string;
  value: string;
}

export function parseMarkdownDocument(raw: string): ParsedMarkdown {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: null, body: raw };
  }
  const frontmatter = match[1] ? match[1].replace(/\n$/, "") : "";
  return { frontmatter, body: raw.slice(match[0].length) };
}

export function serializeMarkdownDocument(
  frontmatter: string | null,
  body: string
) {
  if (frontmatter === null) {
    return body;
  }
  return `---\n${frontmatter}\n---\n${body}`;
}

export function parseFrontmatterEntries(
  yamlString: string
): FrontmatterEntry[] {
  if (!yamlString.trim()) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = parse(yamlString);
  } catch {
    return [{ key: "", value: yamlString, isComplex: false }];
  }

  if (
    parsed === null ||
    parsed === undefined ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    return [];
  }

  return Object.entries(parsed as Record<string, unknown>).map(
    ([key, value]) => {
      if (value === null || value === undefined) {
        return { key, value: "", isComplex: false };
      }
      if (typeof value === "object") {
        return { key, value: stringify(value).trim(), isComplex: true };
      }
      return {
        key,
        value: String(value as string | number | boolean),
        isComplex: false,
      };
    }
  );
}

export function serializeFrontmatterEntries(
  entries: FrontmatterEntry[]
): string {
  const filtered = entries.filter((entry) => entry.key.trim() !== "");
  if (filtered.length === 0) {
    return "";
  }

  const obj: Record<string, unknown> = {};
  for (const entry of filtered) {
    if (entry.isComplex) {
      try {
        obj[entry.key] = parse(entry.value);
      } catch {
        obj[entry.key] = entry.value;
      }
    } else {
      obj[entry.key] = coerceScalar(entry.value);
    }
  }

  return stringify(obj, { lineWidth: 0 }).trim();
}

function coerceScalar(value: string): unknown {
  if (value === "") {
    return "";
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (value === "null") {
    return null;
  }
  const num = Number(value);
  if (!Number.isNaN(num) && value.trim() !== "") {
    return num;
  }
  return value;
}
