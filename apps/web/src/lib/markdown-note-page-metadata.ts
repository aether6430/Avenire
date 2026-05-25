import matter from "gray-matter";
import type { PageMetadataState } from "@/lib/frontmatter";
import { normalizeFrontmatterProperties } from "@/lib/frontmatter";

const FRONTMATTER_TITLE_KEY = "title";

export function extractMarkdownNotePageMetadata(content: string) {
  const parsed = matter(content);
  const frontmatter = parsed.data;
  const record =
    frontmatter &&
    typeof frontmatter === "object" &&
    !Array.isArray(frontmatter)
      ? (frontmatter as Record<string, unknown>)
      : null;

  if (!record) {
    return null;
  }

  const properties = normalizeFrontmatterProperties(
    Object.fromEntries(
      Object.entries(record).filter(
        ([key]) => key.trim().toLowerCase() !== FRONTMATTER_TITLE_KEY
      )
    )
  );

  if (Object.keys(properties).length === 0) {
    return null;
  }

  return {
    bannerUrl: null,
    icon: null,
    properties,
  } satisfies PageMetadataState;
}
